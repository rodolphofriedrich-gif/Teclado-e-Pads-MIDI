import { MidiDestination, MidiRouteConfig } from '../types/midi';
import { NativeMidi } from './nativeMidi';

export interface MidiMessage {
  status: number;
  data1: number;
  data2: number;
  timestamp: number;
  sourceId?: string;
}

export const getNoteName = (note: number): string => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  if (!Number.isInteger(note) || note < 0 || note > 127) return '--';
  const octave = Math.floor(note / 12) - 1;
  return `${noteNames[note % 12]}${octave}`;
};

const DEFAULT_ROUTE_CONFIG: MidiRouteConfig = {
  enabled: true,
  source: 'virtual',
  sourceId: 'virtual-main',
  destinationId: null,
  inputChannel: 0,
  outputChannel: 0,
  transpose: 0,
  velocityMin: 1,
  velocityMax: 127,
  allowNotes: true,
  allowControlChange: true,
  allowProgramChange: true,
  allowPitchBend: true,
};

class MidiService {
  private destinations: MidiDestination[] = [];
  private scannedBleDevices: MidiDestination[] = [];
  private connectedOutput: MidiDestination | null = null;
  private connectedInputs = new Map<string, boolean>();
  private messageListeners: Array<(message: MidiMessage) => void> = [];
  private activityListeners: Array<(velocity: number) => void> = []; // NOVO: Para o VU Meter
  private onRefreshCallback?: (destinations?: MidiDestination[]) => void;
  private onDisconnectCallback?: (destination: MidiDestination) => void;
  private routeConfig: MidiRouteConfig = { ...DEFAULT_ROUTE_CONFIG };
  private listenerReady: Promise<void>;

  constructor() {
    this.listenerReady = this.installNativeListener();
  }

  private async installNativeListener(): Promise<void> {
    try {
      await NativeMidi.addListener('midiMessage', (data) => {
        if (!data || !Array.isArray(data.data)) return;
        this.handleIncomingBytes(data.data, data.sourceId != null ? String(data.sourceId) : undefined);
      });
    } catch (error) {
      console.error('Não foi possível registrar o listener MIDI:', error);
    }
  }

  public setCallbacks(onRefresh: (destinations?: MidiDestination[]) => void, onDisconnect: (destination: MidiDestination) => void): void {
    this.onRefreshCallback = onRefresh;
    this.onDisconnectCallback = onDisconnect;
  }

  public async initWebMidi(): Promise<void> {
    await this.listenerReady;
    await NativeMidi.initialize();
  }

  public async getAvailableDestinations(): Promise<MidiDestination[]> {
    return this.refreshDevices();
  }

  public async refreshDevices(): Promise<MidiDestination[]> {
    try {
      const result = await NativeMidi.getDevices();
      const nativeDevices: MidiDestination[] = (result.devices || []).map((device) => {
        const type = device.type;
        return {
          id: String(device.id),
          name: device.name,
          displayName: device.displayName || device.name,
          type: type === 'usb' || type === 'ble' || type === 'virtual' || type === 'local' ? type : 'usb',
          manufacturer: device.manufacturer,
          inputPortCount: device.inputPortCount,
          outputPortCount: device.outputPortCount,
        };
      });

      const virtualKeyboard: MidiDestination = {
        id: 'virtual-main',
        name: 'Teclado Virtual',
        displayName: 'Teclado Virtual (NexusMIDI Pro)',
        type: 'virtual',
        inputPortCount: 0,
        outputPortCount: 0,
      };

      let merged = [virtualKeyboard, ...nativeDevices.filter((d) => d.id !== virtualKeyboard.id)];

      for (const ble of this.scannedBleDevices) {
        if (!merged.some(d => d.bleAddress === ble.bleAddress || d.id === ble.id)) {
          merged.push(ble);
        }
      }

      this.destinations = merged;
      this.onRefreshCallback?.(this.destinations);
      return this.destinations;
    } catch (error) {
      console.error('Erro ao atualizar dispositivos MIDI:', error);
      return this.destinations;
    }
  }

  public async scanBleDevice(): Promise<any[]> {
    try {
      const result = await NativeMidi.scanBleDevices({ durationMs: 10000 });
      const devices = result.devices || [];

      this.scannedBleDevices = devices.map((dev: any) => ({
        id: `ble-${dev.address}`,
        name: dev.name,
        displayName: `${dev.name} (BLE)`,
        type: 'ble',
        bleAddress: dev.address,
        inputPortCount: 1,
        outputPortCount: 1,
      }));

      await this.refreshDevices();
      return devices;
    } catch (error) {
      console.error('Erro ao procurar dispositivos BLE:', error);
      return [];
    }
  }

  public getDestinations(): MidiDestination[] { return [...this.destinations]; }
  public setRouteConfig(config: MidiRouteConfig): void { this.routeConfig = { ...config }; }
  public getRouteConfig(): MidiRouteConfig { return { ...this.routeConfig }; }
  public async connect(destination: MidiDestination): Promise<void> { await this.connectOutput(destination); }

  public async connectOutput(destination: MidiDestination): Promise<void> {
    if (this.connectedOutput && this.connectedOutput.id !== destination.id) {
      await this.disconnectOutput();
    }

    if (destination.id !== 'virtual-main') {
      if (destination.type === 'ble' && destination.bleAddress) {
        await NativeMidi.connectBleMidi({ address: destination.bleAddress, outputPortIndex: 0, inputPortIndex: 0 });
      } else {
        await NativeMidi.connectOutput({ id: String(destination.id), portIndex: 0 });
      }
    }
    this.connectedOutput = destination;
  }

  public async disconnect(): Promise<void> {
    const previousDestination = this.connectedOutput;
    await this.disconnectOutput();
    if (previousDestination) {
      this.onDisconnectCallback?.(previousDestination);
    }
  }

  public async disconnectOutput(): Promise<void> {
    await this.allNotesOff();
    const destination = this.connectedOutput;
    if (destination && destination.id !== 'virtual-main') {
      if (destination.type === 'ble' && destination.bleAddress) {
        await NativeMidi.disconnectOutput({ id: destination.bleAddress });
      } else {
        await NativeMidi.disconnectOutput({ id: String(destination.id) });
      }
    }
    this.connectedOutput = null;
  }

  public async connectInput(inputId: string): Promise<void> {
    if (inputId === 'virtual-main') return;
    if (this.connectedInputs.has(inputId)) return;
    await NativeMidi.connectInput({ id: String(inputId), portIndex: 0 });
    this.connectedInputs.set(inputId, true);
  }

  public async disconnectInput(inputId: string): Promise<void> {
    if (inputId === 'virtual-main') return;
    if (!this.connectedInputs.has(inputId)) return;
    await NativeMidi.disconnectInput({ id: String(inputId) });
    this.connectedInputs.delete(inputId);
  }

  public async isBleServerRunning(): Promise<boolean> {
    try { return (await NativeMidi.isBleServerRunning()).active === true; } catch { return false; }
  }

  public async startBleServer(): Promise<boolean> {
    try { return (await NativeMidi.startBleServer()).active === true; } catch { return false; }
  }

  public async stopBleServer(): Promise<void> { await NativeMidi.stopBleServer(); }

  // NOVO: Registra e notifica os ouvintes do VU Meter
  public addActivityListener(listener: (velocity: number) => void): void {
    if (!this.activityListeners.includes(listener)) this.activityListeners.push(listener);
  }

  public removeActivityListener(listener: (velocity: number) => void): void {
    this.activityListeners = this.activityListeners.filter((item) => item !== listener);
  }

  public async sendKeyboardNote(channel: number, note: number, velocity: number, isNoteOn: boolean): Promise<{ hex: string }> {
    const safeChannel = this.clamp(Math.trunc(channel), 1, 16);
    const safeNote = this.clamp(Math.trunc(note), 0, 127);
    const safeVelocity = this.clamp(Math.trunc(velocity), 0, 127);
    const status = isNoteOn && safeVelocity > 0 ? 0x90 + safeChannel - 1 : 0x80 + safeChannel - 1;
    this.sendRoutedMessage(status, safeNote, safeVelocity);
    return { hex: [status, safeNote, safeVelocity].map((v) => v.toString(16).padStart(2, '0')).join(' ') };
  }

  public async sendControlChange(channel: number, controller: number, value: number): Promise<{ hex: string }> {
    const status = 0xB0 + this.clamp(Math.trunc(channel), 1, 16) - 1;
    const cc = this.clamp(Math.trunc(controller), 0, 127);
    const safeValue = this.clamp(Math.trunc(value), 0, 127);
    this.sendRoutedMessage(status, cc, safeValue);
    return { hex: this.toHex([status, cc, safeValue]) };
  }

  public async sendProgramChange(channel: number, program: number): Promise<{ hex: string }> {
    const status = 0xC0 + this.clamp(Math.trunc(channel), 1, 16) - 1;
    const safeProgram = this.clamp(Math.trunc(program), 0, 127);
    if (this.routeConfig.enabled && this.routeConfig.allowProgramChange) {
      const finalChannel = this.getOutputChannel((status & 0x0F) + 1);
      await this.transmitBytesNow([0xC0 + finalChannel - 1, safeProgram]);
    }
    return { hex: this.toHex([status, safeProgram]) };
  }

  public async sendPitchBend(channel: number, value: number): Promise<{ hex: string }> {
    const safeChannel = this.clamp(Math.trunc(channel), 1, 16);
    const safeValue = this.clamp(Math.trunc(value), 0, 16383);
    const status = 0xE0 + safeChannel - 1;
    const lsb = safeValue & 0x7F;
    const msb = (safeValue >> 7) & 0x7F;
    if (this.routeConfig.enabled && this.routeConfig.allowPitchBend) {
      const finalChannel = this.getOutputChannel(safeChannel);
      await this.transmitBytesNow([0xE0 + finalChannel - 1, lsb, msb]);
    }
    return { hex: this.toHex([status, lsb, msb]) };
  }

  public async sendPanic(channels: number[]): Promise<void> {
    const destination = this.connectedOutput;
    if (!destination || destination.id === 'virtual-main') return;
    const targetId = destination.bleAddress || String(destination.id);

    for (const ch of channels) {
      const safeCh = this.clamp(Math.trunc(ch), 1, 16);
      const status = 0xB0 + safeCh - 1;
      await NativeMidi.sendTo({ id: targetId, data: [status, 120, 0] });
      await NativeMidi.sendTo({ id: targetId, data: [status, 121, 0] });
      await NativeMidi.sendTo({ id: targetId, data: [status, 123, 0] });
    }
  }

  public sendRoutedMessage(status: number, data1: number, data2: number): void {
    if (!this.routeConfig.enabled) return;
    const command = status & 0xF0;
    const inputChannel = (status & 0x0F) + 1;
    if (this.routeConfig.inputChannel > 0 && inputChannel !== this.routeConfig.inputChannel) return;
    if (command === 0x90 || command === 0x80) { if (!this.routeConfig.allowNotes) return; }
    else if (command === 0xB0 && !this.routeConfig.allowControlChange) return;
    else if (command === 0xC0 && !this.routeConfig.allowProgramChange) return;
    else if (command === 0xE0 && !this.routeConfig.allowPitchBend) return;

    const outputChannel = this.getOutputChannel(inputChannel);
    if (command === 0xC0) { void this.transmitBytesNow([0xC0 + outputChannel - 1, this.clamp(data1, 0, 127)]); return; }
    if (command === 0xD0) { void this.transmitBytesNow([0xD0 + outputChannel - 1, this.clamp(data1, 0, 127)]); return; }

    let finalData1 = this.clamp(data1, 0, 127);
    let finalData2 = this.clamp(data2, 0, 127);

    if (command === 0x90 || command === 0x80) {
      finalData1 = this.clamp(finalData1 + this.routeConfig.transpose, 0, 127);
      if (command === 0x90 && finalData2 > 0) {
        finalData2 = this.clamp(finalData2, this.routeConfig.velocityMin, this.routeConfig.velocityMax);
      }
    }
    void this.transmitBytesNow([command + outputChannel - 1, finalData1, finalData2]);
  }

  private getOutputChannel(inputChannel: number): number {
    return this.routeConfig.outputChannel > 0 ? this.clamp(this.routeConfig.outputChannel, 1, 16) : inputChannel;
  }

  private async transmitBytesNow(bytes: number[], targetDest?: MidiDestination | null): Promise<void> {
    const destination = targetDest !== undefined ? targetDest : this.connectedOutput;
    if (!destination || destination.id === 'virtual-main') return;
    try {
      await NativeMidi.sendTo({ id: destination.bleAddress || String(destination.id), data: bytes });
    } catch (error) {
      console.error('Erro ao transmitir mensagem MIDI:', error);
    }
  }

  public async allNotesOff(): Promise<void> {
    const destination = this.connectedOutput;
    if (!destination || destination.id === 'virtual-main') return;
    for (let channel = 1; channel <= 16; channel++) {
      const status = 0xB0 + channel - 1;
      await this.transmitBytesNow([status, 123, 0], destination);
    }
  }

  public handleIncomingBytes(bytes: number[], sourceId?: string): void {
    if (!Array.isArray(bytes) || bytes.length < 2) return;
    const status = bytes[0] & 0xFF;
    if (status < 0x80 || status >= 0xF0) return;
    const command = status & 0xF0;
    const requiredLength = command === 0xC0 || command === 0xD0 ? 2 : 3;
    if (bytes.length < requiredLength) return;

    const data1 = this.clamp(bytes[1], 0, 127);
    const data2 = requiredLength === 3 ? this.clamp(bytes[2], 0, 127) : 0;
    const message: MidiMessage = { status, data1, data2, timestamp: Date.now(), sourceId };

    // NOVO: Se for Note On, dispara o VU Meter
    if (command === 0x90 && data2 > 0) {
      this.activityListeners.forEach(listener => {
        try { listener(data2); } catch {}
      });
    }

    this.messageListeners.forEach((listener) => {
      try { listener(message); } catch (error) { console.error('Erro em listener MIDI:', error); }
    });

    if (this.routeConfig.source === 'device') {
      if (this.routeConfig.sourceId && sourceId !== this.routeConfig.sourceId) return;
    } else if (sourceId && sourceId !== 'virtual-main') {
      return;
    }
    this.sendRoutedMessage(status, data1, data2);
  }

  public addMessageListener(listener: (message: MidiMessage) => void): void {
    if (!this.messageListeners.includes(listener)) this.messageListeners.push(listener);
  }

  public removeMessageListener(listener: (message: MidiMessage) => void): void {
    this.messageListeners = this.messageListeners.filter((item) => item !== listener);
  }

  public getConnectedDestination(): MidiDestination | null { return this.connectedOutput; }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.max(minimum, Math.min(maximum, value));
  }

  private toHex(bytes: number[]): string {
    return bytes.map((v) => v.toString(16).padStart(2, '0')).join(' ');
  }
}

export const midiService = new MidiService();
export const midiManager = midiService;
