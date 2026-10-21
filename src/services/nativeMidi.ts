import { registerPlugin } from '@capacitor/core';

export type NativeMidiDeviceType =
  | 'local'
  | 'usb'
  | 'ble'
  | 'virtual'
  | 'unknown';

export interface NativeMidiDevice {
  id: string;
  name: string;
  displayName?: string;
  manufacturer?: string;
  type: NativeMidiDeviceType;
  inputPortCount: number;
  outputPortCount: number;
}

export interface NativeBleDevice {
  address: string;
  name: string;
}

export interface NativeMidiConnection {
  id: string;
  name: string;
  port?: number;
}

export interface NativeBleServerStatus {
  active: boolean;
  clients?: number;
}

export interface NativeMidiMessageEvent {
  data: number[];
  sourceId?: string | number;
}

export interface NativeMidiPlugin {
  initialize(): Promise<void>;

  getDevices(): Promise<{
    devices: NativeMidiDevice[];
  }>;

  connect(options: {
    id: string;
    port?: number;
    portIndex?: number;
  }): Promise<NativeMidiConnection>;

  connectOutput(options: {
    id: string;
    port?: number;
    portIndex?: number;
  }): Promise<NativeMidiConnection>;

  connectInput(options: {
    id: string;
    port?: number;
    portIndex?: number;
    address?: string;
  }): Promise<NativeMidiConnection>;

  disconnect(options?: {
    id?: string;
  }): Promise<void>;

  disconnectOutput(options?: {
    id?: string;
  }): Promise<void>;

  disconnectInput(options?: {
    id?: string;
  }): Promise<void>;

  send(options: {
    data: number[];
    outputId?: string;
    id?: string;
  }): Promise<void>;

  sendTo(options: {
    id: string;
    data: number[];
  }): Promise<void>;

  // Funções de BLE corrigidas e adicionadas
  scanBleDevices(options?: {
    durationMs?: number;
  }): Promise<{
    devices: NativeBleDevice[];
  }>;

  stopBleScan(): Promise<void>;

  connectBleMidi(options: {
    address: string;
    outputPortIndex?: number;
    inputPortIndex?: number;
  }): Promise<{
    address: string;
    name: string;
    outputConnected: boolean;
    inputConnected: boolean;
  }>;

  scanBluetoothMidi(options?: {
    durationMs?: number;
  }): Promise<{
    devices: NativeBleDevice[];
  }>;

  startBleServer(): Promise<NativeBleServerStatus>;
  stopBleServer(): Promise<NativeBleServerStatus | void>;
  isBleServerRunning(): Promise<NativeBleServerStatus>;
  fecharApp(): Promise<void>;

  addListener(
    eventName: 'midiMessage',
    listenerFunc: (data: NativeMidiMessageEvent) => void,
  ): Promise<{ remove: () => Promise<void> }>;

  addListener(
    eventName: 'devicesChanged',
    listenerFunc: () => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

export const NativeMidi = registerPlugin<NativeMidiPlugin>('NativeMidi');
