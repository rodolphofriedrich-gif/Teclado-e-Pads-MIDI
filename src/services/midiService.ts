import { MidiDestination, MidiRouteConfig } from '../types/midi';
import { NativeMidi } from './nativeMidi';

export interface MidiMessage {
  status: number; data1: number; data2: number; timestamp: number;
  direction?: 'RX' | 'TX'; sourceId?: string;
}

export const getNoteName = (note: number): string => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  if (!Number.isInteger(note) || note < 0 || note > 127) return '--';
  return `${names[note % 12]}${Math.floor(note / 12) - 1}`;
};

const DEFAULT_ROUTE_CONFIG: MidiRouteConfig = {
  enabled: true, source: 'virtual', sourceId: 'virtual-main', destinationId: null,
  inputChannel: 0, outputChannel: 0, transpose: 0, velocityMin: 1, velocityMax: 127,
  fixedVelocity: 0, allowNotes: true, allowControlChange: true,
  allowProgramChange: true, allowPitchBend: true,
};

class MidiService {
  private destinations: MidiDestination[] = [];
  private scannedBleDevices: MidiDestination[] = [];
  private connectedOutput: MidiDestination | null = null;
  private connectedInputs = new Map<string, boolean>();
  private messageListeners: Array<(msg: MidiMessage) => void> = [];
  private onRefreshCallback?: (destinations?: MidiDestination[]) => void;
  private onDisconnectCallback?: (destination: MidiDestination) => void;
  private routeConfig: MidiRouteConfig = { ...DEFAULT_ROUTE_CONFIG };
  private listenerReady: Promise<void>;
  private nativeListenerHandle: { remove: () => Promise<void> } | null = null;
  private activeNotesMap = new Map<string, number>();

  constructor() { this.listenerReady = this.installNativeListener(); }

  private async installNativeListener(): Promise<void> {
    try {
      this.nativeListenerHandle = await NativeMidi.addListener('midiMessage', (data) => {
        if (!data?.data || !Array.isArray(data.data)) return;
        this.handleIncomingBytes(data.data, data.sourceId != null ? String(data.sourceId) : undefined);
      });
    } catch (e) { console.error('Listener nativo MIDI:', e); }
  }

  public setCallbacks(onRefresh: (d?: MidiDestination[]) => void, onDisconnect: (d: MidiDestination) => void): void {
    this.onRefreshCallback = onRefresh; this.onDisconnectCallback = onDisconnect;
  }

  public async initWebMidi(): Promise<void> {
    await this.listenerReady; await NativeMidi.initialize();
  }

  public async getAvailableDestinations(): Promise<MidiDestination[]> { return this.refreshDevices(); }

  public async refreshDevices(): Promise<MidiDestination[]> {
    try {
      const result = await NativeMidi.getDevices();
      const natives: MidiDestination[] = (result.devices || []).map((device) => ({
        id: String(device.id), name: device.name, displayName: device.displayName || device.name,
        type: (['usb','ble','virtual','local'].includes(device.type) ? device.type : 'usb') as any,
        manufacturer: device.manufacturer, inputPortCount: device.inputPortCount, outputPortCount: device.outputPortCount,
      }));

      const virt: MidiDestination = { id: 'virtual-main', name: 'Teclado Virtual', displayName: 'Teclado Virtual', type: 'virtual', inputPortCount: 0, outputPortCount: 0 };
      const merged: MidiDestination[] = [virt, ...natives.filter(d => d.id !== virt.id && (d.inputPortCount ?? 1) > 0)];
      
      for (const ble of this.scannedBleDevices) {
        if (!merged.some(d => d.bleAddress === ble.bleAddress || d.id === ble.id)) merged.push(ble);
      }
      this.destinations = merged;
      this.onRefreshCallback?.(this.destinations);
      return this.destinations;
    } catch (e) { console.error('refreshDevices:', e); return this.destinations; }
  }

  public async scanBleDevice(): Promise<any[]> {
    try {
      if (!NativeMidi.scanBleDevices) return [];
      const result = await NativeMidi.scanBleDevices({ durationMs: 10000 });
      const devices = result.devices || [];
      this.scannedBleDevices = devices.map((d: any) => ({
        id: `ble-${d.address}`, name: d.name, displayName: `${d.name} (BLE)`,
        type: 'ble' as const, bleAddress: d.address, inputPortCount: 1, outputPortCount: 1,
      }));
      await this.refreshDevices();
      return devices;
    } catch (e) { console.error('scanBle:', e); return []; }
  }

  public getDestinations(): MidiDestination[] { return [...this.destinations]; }
  public setRouteConfig(c: MidiRouteConfig): void { this.routeConfig = { ...c }; }
  public getRouteConfig(): MidiRouteConfig { return { ...this.routeConfig }; }

  public async connect(dest: MidiDestination): Promise<void> { await this.connectOutput(dest); }

  public async connectOutput(dest: MidiDestination): Promise<void> {
    if (this.connectedOutput && this.connectedOutput.id !== dest.id) await this.disconnectOutput();
    if (dest.id !== 'virtual-main') {
      if (dest.type === 'ble' && dest.bleAddress) {
        if (!NativeMidi.connectBleMidi) throw new Error('Sem suporte a BLE MIDI.');
        await NativeMidi.connectBleMidi({ address: dest.bleAddress, outputPortIndex: 0, inputPortIndex: 0 });
      } else {
        await NativeMidi.connectOutput({ id: String(dest.id), portIndex: 0 });
      }
    }
    this.connectedOutput = dest;
  }

  public async disconnect(): Promise<void> {
    const prev = this.connectedOutput; await this.disconnectOutput();
    if (prev) this.onDisconnectCallback?.(prev);
  }

  public async disconnectOutput(): Promise<void> {
    await this.allNotesOff();
    const dest = this.connectedOutput;
    if (dest && dest.id !== 'virtual-main') {
      if (dest.type === 'ble' && dest.bleAddress) await NativeMidi.disconnectOutput({ id: dest.bleAddress });
      else await NativeMidi.disconnectOutput({ id: String(dest.id) });
    }
    this.connectedOutput = null;
    this.activeNotesMap.clear();
  }

  public async connectInput(id: string): Promise<void> {
    if (id === 'virtual-main') return;
    if (!id || id === 'none') { for (const i of Array.from(this.connectedInputs.keys())) await this.disconnectInput(i); return; }
    if (this.connectedInputs.has(id)) return;
    await NativeMidi.connectInput({ id: String(id), portIndex: 0 });
    this.connectedInputs.set(id, true);
  }

  public async disconnectInput(id: string): Promise<void> {
    if (id === 'virtual-main' || !this.connectedInputs.has(id)) return;
    await NativeMidi.disconnectInput({ id: String(id) });
    this.connectedInputs.delete(id);
  }

  public async sendKeyboardNote(channel: number, note: number, velocity: number, isNoteOn: boolean, sourceId: string = 'keyboard'): Promise<{ hex: string }> {
    let safeChannel = this.clamp(Math.trunc(channel), 1, 16);
    const safeNote = this.clamp(Math.trunc(note), 0, 127);
    const safeVel = this.clamp(Math.trunc(velocity), 0, 127);
    const key = `${sourceId}:${safeNote}`;

    if (isNoteOn && safeVel > 0) this.activeNotesMap.set(key, safeChannel);
    else {
      const orig = this.activeNotesMap.get(key);
      if (orig) { safeChannel = orig; this.activeNotesMap.delete(key); }
    }

    const status = isNoteOn && safeVel > 0 ? 0x90 + safeChannel - 1 : 0x80 + safeChannel - 1;
    this.sendRoutedMessage(status, safeNote, safeVel);
    return { hex: [status, safeNote, safeVel].map(v => v.toString(16).padStart(2, '0')).join(' ') };
  }

  public async sendControlChange(channel: number, cc: number, value: number) {
    const status = 0xB0 + this.clamp(Math.trunc(channel), 1, 16) - 1;
    const c = this.clamp(Math.trunc(cc), 0, 127), v = this.clamp(Math.trunc(value), 0, 127);
    this.sendRoutedMessage(status, c, v);
    return { hex: this.toHex([status, c, v]) };
  }

  public async sendProgramChange(channel: number, program: number) {
    const status = 0xC0 + this.clamp(Math.trunc(channel), 1, 16) - 1;
    const p = this.clamp(Math.trunc(program), 0, 127);
    if (this.routeConfig.enabled && this.routeConfig.allowProgramChange) {
      const fc = this.getOutputChannel((status & 0x0F) + 1);
      await this.transmitBytesNow([0xC0 + fc - 1, p]);
    }
    return { hex: this.toHex([status, p]) };
  }

  public async sendPitchBend(channel: number, value: number) {
    const ch = this.clamp(Math.trunc(channel), 1, 16), v = this.clamp(Math.trunc(value), 0, 16383);
    const status = 0xE0 + ch - 1, lsb = v & 0x7F, msb = (v >> 7) & 0x7F;
    if (this.routeConfig.enabled && this.routeConfig.allowPitchBend) {
      const fc = this.getOutputChannel(ch);
      await this.transmitBytesNow([0xE0 + fc - 1, lsb, msb]);
    }
    return { hex: this.toHex([status, lsb, msb]) };
  }

  public async sendChannelPressure(channel: number, pressure: number) {
    const ch = this.clamp(Math.trunc(channel), 1, 16), v = this.clamp(Math.trunc(pressure), 0, 127);
    if (this.routeConfig.enabled) {
      const fc = this.getOutputChannel(ch);
      await this.transmitBytesNow([0xD0 + fc - 1, v]);
    }
    return { hex: this.toHex([0xD0 + ch - 1, v]) };
  }

  public async sendPanic(channels: number[]): Promise<void> {
    const dest = this.connectedOutput; if (!dest || dest.id === 'virtual-main') return;
    for (const ch of channels) {
      const s = 0xB0 + this.clamp(Math.trunc(ch), 1, 16) - 1;
      await this.transmitBytesNow([s, 120, 0], dest);
      await this.transmitBytesNow([s, 121, 0], dest);
      await this.transmitBytesNow([s, 123, 0], dest);
    }
    this.activeNotesMap.clear();
  }

  public sendRoutedMessage(status: number, data1: number, data2: number): void {
    if (!this.routeConfig.enabled) return;
    const cmd = status & 0xF0, inCh = (status & 0x0F) + 1;
    if (this.routeConfig.inputChannel > 0 && inCh !== this.routeConfig.inputChannel) return;
    if (cmd === 0x90 || cmd === 0x80) { if (!this.routeConfig.allowNotes) return; }
    else if (cmd === 0xB0 && !this.routeConfig.allowControlChange) return;
    else if (cmd === 0xC0 && !this.routeConfig.allowProgramChange) return;
    else if (cmd === 0xE0 && !this.routeConfig.allowPitchBend) return;

    const outCh = this.getOutputChannel(inCh);
    if (cmd === 0xC0) { void this.transmitBytesNow([0xC0 + outCh - 1, this.clamp(data1, 0, 127)]); return; }
    if (cmd === 0xD0) { void this.transmitBytesNow([0xD0 + outCh - 1, this.clamp(data1, 0, 127)]); return; }

    let d1 = this.clamp(data1, 0, 127), d2 = this.clamp(data2, 0, 127);
    if (cmd === 0x90 || cmd === 0x80) {
      d1 = this.clamp(d1 + this.routeConfig.transpose, 0, 127);
      if (cmd === 0x90 && d2 > 0) d2 = this.routeConfig.fixedVelocity > 0 ? this.routeConfig.fixedVelocity : this.clamp(d2, this.routeConfig.velocityMin, this.routeConfig.velocityMax);
    }
    void this.transmitBytesNow([cmd + outCh - 1, d1, d2]);
  }

  private getOutputChannel(inCh: number): number {
    return this.routeConfig.outputChannel > 0 ? this.clamp(this.routeConfig.outputChannel, 1, 16) : inCh;
  }

  private async transmitBytesNow(bytes: number[], target?: MidiDestination | null): Promise<void> {
    const dest = target !== undefined ? target : this.connectedOutput;
    if (!dest || dest.id === 'virtual-main') return;
    if (bytes.length >= 2) {
      const s = bytes[0] & 0xFF;
      if (s >= 0x80 && s < 0xF0) this.notifyListeners({ status: s, data1: bytes[1] ?? 0, data2: bytes[2] ?? 0, timestamp: Date.now(), direction: 'TX', sourceId: dest.id });
    }
    try { await NativeMidi.sendTo({ id: dest.bleAddress || String(dest.id), data: bytes }); }
    catch (e) { console.error('transmitBytesNow:', e); }
  }

  public async allNotesOff(): Promise<void> {
    const dest = this.connectedOutput; if (!dest || dest.id === 'virtual-main') return;
    for (const [key, channel] of this.activeNotesMap.entries()) {
      const note = Number(key.split(':')[1]);
      await this.transmitBytesNow([0x80 + channel - 1, note, 0], dest);
    }
    this.activeNotesMap.clear();
    for (let ch = 1; ch <= 16; ch++) await this.transmitBytesNow([0xB0 + ch - 1, 123, 0], dest);
  }

  public handleIncomingBytes(bytes: number[], sourceId?: string): void {
    if (!Array.isArray(bytes) || bytes.length < 2) return;
    const status = bytes[0] & 0xFF;
    if (status < 0x80 || status >= 0xF0) return;
    const cmd = status & 0xF0, len = (cmd === 0xC0 || cmd === 0xD0) ? 2 : 3;
    if (bytes.length < len) return;
    const d1 = this.clamp(bytes[1], 0, 127), d2 = len === 3 ? this.clamp(bytes[2], 0, 127) : 0;
    this.notifyListeners({ status, data1: d1, data2: d2, timestamp: Date.now(), direction: 'RX', sourceId });
    
    if (this.routeConfig.source === 'device') {
      if (this.routeConfig.sourceId && sourceId !== this.routeConfig.sourceId) return;
    } else if (sourceId && sourceId !== 'virtual-main') return;
    this.sendRoutedMessage(status, d1, d2);
  }

  private notifyListeners(msg: MidiMessage): void {
    this.messageListeners.forEach(l => { try { l(msg); } catch (e) { console.error('Listener:', e); } });
  }

  public addMessageListener(l: (m: MidiMessage) => void): void { if (!this.messageListeners.includes(l)) this.messageListeners.push(l); }
  public removeMessageListener(l: (m: MidiMessage) => void): void { this.messageListeners = this.messageListeners.filter(x => x !== l); }
  public getConnectedDestination(): MidiDestination | null { return this.connectedOutput; }

  private clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
  private toHex(b: number[]): string { return b.map(v => v.toString(16).padStart(2, '0')).join(' '); }
}

export const midiService = new MidiService();
export const midiManager = midiService;
