package com.midi.controller.keyboard.plugins;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.midi.MidiDevice;
import android.media.midi.MidiDeviceInfo;
import android.media.midi.MidiInputPort;
import android.media.midi.MidiManager;
import android.media.midi.MidiOutputPort;
import android.media.midi.MidiReceiver;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.IOException;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(
    name = "NativeMidi",
    permissions = {
        @Permission(
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT
            },
            alias = "bluetooth"
        )
    }
)
public class NativeMidiPlugin extends Plugin {

    private static final UUID MIDI_SERVICE_UUID = UUID.fromString("03B80E5A-EDE8-4B33-A751-6CE34EC4C700");

    private MidiManager midiManager;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private final Map<String, MidiDevice> outputDevices = new ConcurrentHashMap<>();
    private final Map<String, MidiInputPort> outputPorts = new ConcurrentHashMap<>();
    private final Map<String, MidiDevice> inputDevices = new ConcurrentHashMap<>();
    private final Map<String, MidiOutputPort> inputPorts = new ConcurrentHashMap<>();

    private BluetoothLeScanner bleScanner;
    private ScanCallback activeScanCallback;
    private PluginCall pendingScanCall;

    @Override
    public void load() {
        super.load();
        midiManager = (MidiManager) getContext().getSystemService(Context.MIDI_SERVICE);
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        if (midiManager == null) {
            call.reject("MidiManager indisponível neste dispositivo");
        } else {
            call.resolve();
        }
    }

    // ================================================================
    // Permissões BLE (Faltava este método no código original)
    // ================================================================
    @PermissionCallback
    private void blePermissionCallback(PluginCall call) {
        if (hasBlePermissions()) {
            // Se o usuário aceitou, tenta rodar a busca novamente
            scanBleDevices(call);
        } else {
            call.reject("Permissão de Bluetooth negada. Vá nas configurações do Android e permita.");
        }
    }

    @PluginMethod
    public void getDevices(PluginCall call) {
        JSArray devices = new JSArray();
        if (midiManager != null) {
            for (MidiDeviceInfo info : midiManager.getDevices()) {
                devices.put(deviceToJS(info));
            }
        }
        JSObject result = new JSObject();
        result.put("devices", devices);
        call.resolve(result);
    }

    private JSObject deviceToJS(MidiDeviceInfo info) {
        Bundle properties = info.getProperties();
        String name = properties != null ? properties.getString("name") : null;
        String manufacturer = properties != null ? properties.getString("manufacturer") : null;

        if (name == null || name.trim().isEmpty()) {
            name = (manufacturer != null && !manufacturer.trim().isEmpty()) ? manufacturer : "Dispositivo MIDI";
        }

        JSObject item = new JSObject();
        item.put("id", String.valueOf(info.getId()));
        item.put("name", name);
        item.put("displayName", name);
        item.put("type", getDeviceType(info));
        item.put("inputPortCount", info.getInputPortCount());
        item.put("outputPortCount", info.getOutputPortCount());

        if (manufacturer != null && !manufacturer.trim().isEmpty()) {
            item.put("manufacturer", manufacturer);
        }
        return item;
    }

    private String getDeviceType(MidiDeviceInfo info) {
        switch (info.getType()) {
            case MidiDeviceInfo.TYPE_USB:        return "usb";
            case MidiDeviceInfo.TYPE_BLUETOOTH:  return "ble";
            case MidiDeviceInfo.TYPE_VIRTUAL:    return "virtual";
            default:                             return "unknown";
        }
    }

    // ================================================================
    // BLE – Scan
    // ================================================================
    @PluginMethod
    public void scanBleDevices(PluginCall call) {
        if (!hasBlePermissions()) {
            requestPermissionForAlias("bluetooth", call, "blePermissionCallback");
            return;
        }

        BluetoothManager btManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = btManager != null ? btManager.getAdapter() : null;

        if (adapter == null || !adapter.isEnabled()) {
            call.reject("Bluetooth desativado ou indisponível");
            return;
        }

        bleScanner = adapter.getBluetoothLeScanner();
        if (bleScanner == null) {
            call.reject("BluetoothLeScanner indisponível");
            return;
        }

        stopBleScanInternal();

        int durationMs = call.getInt("durationMs", 10000);
        
        pendingScanCall = call;
        final JSArray foundDevices = new JSArray();
        final Set<String> foundAddresses = new HashSet<>();

        ScanFilter filter = new ScanFilter.Builder()
                .setServiceUuid(new ParcelUuid(MIDI_SERVICE_UUID))
                .build();

        ScanSettings settings = new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
                .build();

        activeScanCallback = new ScanCallback() {
            @Override
            public void onScanResult(int callbackType, ScanResult result) {
                BluetoothDevice device = result.getDevice();
                String address = device.getAddress();
                
                if (!foundAddresses.contains(address)) {
                    foundAddresses.add(address);
                    JSObject item = new JSObject();
                    item.put("address", address);
                    item.put("name", device.getName() != null ? device.getName() : "Dispositivo BLE MIDI");
                    item.put("rssi", result.getRssi());
                    foundDevices.put(item);
                    
                    notifyListeners("bleDeviceFound", item);
                }
            }
        };

        bleScanner.startScan(java.util.Collections.singletonList(filter), settings, activeScanCallback);

        mainHandler.postDelayed(() -> {
            stopBleScanInternal();
            if (pendingScanCall != null) {
                JSObject result = new JSObject();
                result.put("devices", foundDevices);
                pendingScanCall.resolve(result);
                pendingScanCall = null;
            }
        }, durationMs);
    }

    @PluginMethod
    public void stopBleScan(PluginCall call) {
        stopBleScanInternal();
        if (pendingScanCall != null) {
            JSObject result = new JSObject();
            result.put("devices", new JSArray());
            pendingScanCall.resolve(result);
            pendingScanCall = null;
        }
        call.resolve();
    }

    private void stopBleScanInternal() {
        if (bleScanner != null && activeScanCallback != null) {
            try {
                bleScanner.stopScan(activeScanCallback);
            } catch (Exception ignored) {}
            activeScanCallback = null;
        }
    }

    // ================================================================
    // BLE – Conexão
    // ================================================================
    @PluginMethod
    public void connectBleMidi(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            call.reject("A conexão direta BLE requer Android 13 ou superior. Use o emparelhamento nas configurações do sistema.");
            return;
        }

        if (!hasBlePermissions()) {
            requestPermissionForAlias("bluetooth", call, "blePermissionCallback");
            return;
        }

        String address = call.getString("address");
        if (address == null || address.trim().isEmpty()) {
            call.reject("Endereço Bluetooth não informado");
            return;
        }

        int outputPortIndex = call.getInt("outputPortIndex", 0);
        int inputPortIndex = call.getInt("inputPortIndex", -1);

        BluetoothManager btManager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = btManager != null ? btManager.getAdapter() : null;

        if (adapter == null) {
            call.reject("BluetoothAdapter indisponível");
            return;
        }

        BluetoothDevice btDevice;
        try {
            btDevice = adapter.getRemoteDevice(address);
        } catch (IllegalArgumentException e) {
            call.reject("Endereço Bluetooth inválido: " + address);
            return;
        }

        midiManager.openBluetoothDevice(btDevice, device -> {
            if (device == null) {
                call.reject("Não foi possível abrir o dispositivo BLE MIDI");
                return;
            }

            MidiInputPort outputPort = device.openInputPort(outputPortIndex);
            if (outputPort == null) {
                closeDevice(device);
                call.reject("Não foi possível abrir a porta de saída BLE");
                return;
            }

            outputPorts.put(address, outputPort);
            outputDevices.put(address, device);

            if (inputPortIndex >= 0) {
                MidiOutputPort inputPort = device.openOutputPort(inputPortIndex);
                if (inputPort != null) {
                    inputPort.connect(new MidiReceiver() {
                        @Override
                        public void onSend(byte[] data, int offset, int count, long timestamp) throws IOException {
                            JSArray messageData = new JSArray();
                            for (int i = offset; i < offset + count; i++) {
                                messageData.put(data[i] & 0xFF);
                            }
                            JSObject message = new JSObject();
                            message.put("data", messageData);
                            message.put("sourceId", address);
                            notifyListeners("midiMessage", message);
                        }
                    });
                    inputPorts.put(address, inputPort);
                    inputDevices.put(address, device);
                }
            }

            JSObject result = new JSObject();
            result.put("address", address);
            result.put("name", btDevice.getName() != null ? btDevice.getName() : "BLE MIDI");
            result.put("outputConnected", true);
            result.put("inputConnected", inputPortIndex >= 0);
            call.resolve(result);

        }, mainHandler);
    }

    // ================================================================
    // Conexões USB / já pareadas
    // ================================================================
    @PluginMethod
    public void connect(PluginCall call) { connectOutputInternal(call); }

    @PluginMethod
    public void connectOutput(PluginCall call) { connectOutputInternal(call); }

    private void connectOutputInternal(PluginCall call) {
        if (midiManager == null) {
            call.reject("MidiManager indisponível neste dispositivo");
            return;
        }

        String id = call.getString("id");
        if (id == null || id.trim().isEmpty()) {
            call.reject("ID do dispositivo de saída obrigatório");
            return;
        }

        MidiDeviceInfo info = findDevice(id);
        if (info == null) {
            call.reject("Dispositivo MIDI de saída não encontrado");
            return;
        }

        int portIndex = getPortIndex(call);
        if (portIndex < 0 || portIndex >= info.getInputPortCount()) {
            call.reject("Índice da porta de saída inválido");
            return;
        }

        midiManager.openDevice(info, device -> {
            if (device == null) {
                call.reject("Não foi possível abrir o dispositivo de saída");
                return;
            }

            MidiInputPort port = device.openInputPort(portIndex);
            if (port == null) {
                closeDevice(device);
                call.reject("Não foi possível abrir a porta MIDI de destino");
                return;
            }

            MidiInputPort oldPort = outputPorts.put(id, port);
            MidiDevice oldDevice = outputDevices.put(id, device);
            closePort(oldPort);
            if (oldDevice != null && oldDevice != device) closeDevice(oldDevice);

            JSObject result = new JSObject();
            result.put("id", id);
            result.put("name", getDeviceName(info));
            call.resolve(result);

        }, mainHandler);
    }

    @PluginMethod
    public void connectInput(PluginCall call) {
        if (midiManager == null) {
            call.reject("MidiManager indisponível neste dispositivo");
            return;
        }

        String id = call.getString("id");
        if (id == null || id.trim().isEmpty()) {
            call.reject("Identificador do dispositivo não informado");
            return;
        }

        MidiDeviceInfo info = findDevice(id);
        if (info == null) {
            call.reject("Dispositivo MIDI não encontrado");
            return;
        }

        int portIndex = getPortIndex(call);
        if (portIndex < 0 || portIndex >= info.getOutputPortCount()) {
            call.reject("Índice da porta de entrada inválido");
            return;
        }

        midiManager.openDevice(info, device -> {
            if (device == null) {
                call.reject("Não foi possível abrir o dispositivo de entrada");
                return;
            }

            MidiOutputPort port = device.openOutputPort(portIndex);
            if (port == null) {
                closeDevice(device);
                call.reject("Não foi possível abrir a porta MIDI de origem");
                return;
            }

            port.connect(new MidiReceiver() {
                @Override
                public void onSend(byte[] data, int offset, int count, long timestamp) throws IOException {
                    JSArray messageData = new JSArray();
                    for (int i = offset; i < offset + count; i++) {
                        messageData.put(data[i] & 0xFF);
                    }
                    JSObject message = new JSObject();
                    message.put("data", messageData);
                    message.put("sourceId", id);
                    notifyListeners("midiMessage", message);
                }
            });

            MidiOutputPort oldPort = inputPorts.put(id, port);
            MidiDevice oldDevice = inputDevices.put(id, device);
            closePort(oldPort);
            if (oldDevice != null && oldDevice != device) closeDevice(oldDevice);

            JSObject result = new JSObject();
            result.put("id", id);
            result.put("name", getDeviceName(info));
            result.put("port", portIndex);
            call.resolve(result);

        }, mainHandler);
    }

    // ================================================================
    // Desconexões
    // ================================================================
    @PluginMethod
    public void disconnect(PluginCall call) { disconnectOutput(call); }

    @PluginMethod
    public void disconnectOutput(PluginCall call) {
        String id = call.getString("id");
        if (id != null) closeOutputConnection(id);
        else            closeAllOutputConnections();
        call.resolve();
    }

    @PluginMethod
    public void disconnectInput(PluginCall call) {
        String id = call.getString("id");
        if (id != null) closeInputConnection(id);
        else            closeAllInputConnections();
        call.resolve();
    }

    // ================================================================
    // Envio de MIDI
    // ================================================================
    @PluginMethod
    public void send(PluginCall call)   { sendToDevice(call); }

    @PluginMethod
    public void sendTo(PluginCall call) { sendToDevice(call); }

    private void sendToDevice(PluginCall call) {
        String id = call.getString("id");
        if (id == null) id = call.getString("outputId");

        JSArray data = call.getArray("data");

        if (id == null || id.trim().isEmpty()) {
            call.reject("ID da saída MIDI não informado");
            return;
        }
        if (data == null || data.length() == 0) {
            call.reject("Dados MIDI não informados");
            return;
        }

        MidiInputPort port = outputPorts.get(id);
        if (port == null) {
            call.reject("Saída MIDI não está conectada");
            return;
        }

        try {
            byte[] bytes = new byte[data.length()];
            for (int i = 0; i < data.length(); i++) {
                int value = data.getInt(i);
                if (value < 0 || value > 255) {
                    call.reject("Byte MIDI inválido: " + value);
                    return;
                }
                bytes[i] = (byte) value;
            }
            port.send(bytes, 0, bytes.length, System.nanoTime());
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha no envio MIDI: " + e.getMessage());
        }
    }

    // ================================================================
    // Utilitários
    // ================================================================
    private boolean hasBlePermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    private int getPortIndex(PluginCall call) {
        Integer index = call.getInt("portIndex");
        if (index == null) index = call.getInt("port");
        return index != null ? index : 0;
    }

    private MidiDeviceInfo findDevice(String id) {
        if (midiManager == null) return null;
        for (MidiDeviceInfo info : midiManager.getDevices()) {
            if (String.valueOf(info.getId()).equals(id)) return info;
        }
        return null;
    }

    private String getDeviceName(MidiDeviceInfo info) {
        Bundle properties = info.getProperties();
        if (properties != null) {
            String name = properties.getString("name");
            if (name != null && !name.trim().isEmpty()) return name;
        }
        return "Dispositivo MIDI";
    }

    private void closeOutputConnection(String id) {
        closePort(outputPorts.remove(id));
        if (!inputPorts.containsKey(id)) {
            closeDevice(outputDevices.remove(id));
        }
    }

    private void closeInputConnection(String id) {
        closePort(inputPorts.remove(id));
        if (!outputPorts.containsKey(id)) {
            closeDevice(inputDevices.remove(id));
        }
    }

    private void closeAllOutputConnections() {
        Set<String> ids = new HashSet<>(outputPorts.keySet());
        ids.addAll(outputDevices.keySet());
        for (String id : ids) closeOutputConnection(id);
    }

    private void closeAllInputConnections() {
        Set<String> ids = new HashSet<>(inputPorts.keySet());
        ids.addAll(inputDevices.keySet());
        for (String id : ids) closeInputConnection(id);
    }

    private void closePort(MidiInputPort port) {
        if (port != null) try { port.close(); } catch (IOException ignored) {}
    }

    private void closePort(MidiOutputPort port) {
        if (port != null) try { port.close(); } catch (IOException ignored) {}
    }

    private void closeDevice(MidiDevice device) {
        if (device != null) try { device.close(); } catch (IOException ignored) {}
    }

    // ================================================================
    // Ciclo de vida
    // ================================================================
    @PluginMethod
    public void fecharApp(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    activity.finishAndRemoveTask();
                } else {
                    activity.finish();
                }
            });
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        stopBleScanInternal();
        closeAllInputConnections();
        closeAllOutputConnections();
        super.handleOnDestroy();
    }
}
