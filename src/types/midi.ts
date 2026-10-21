export type MidiDeviceType = 'local' | 'usb' | 'ble' | 'virtual' | 'unknown';

export interface MidiDestination {
  id: string;
  name: string;
  displayName: string;
  type: MidiDeviceType;
  manufacturer?: string;
  inputPortCount?: number;
  outputPortCount?: number;
  bleAddress?: string;
  isVirtual?: boolean;
}

export interface MidiRouteConfig {
  enabled: boolean;
  source: 'virtual' | 'device';
  sourceId: string;
  destinationId: string | null;
  inputChannel: number;   // 0 = Omni
  outputChannel: number;  // 0 = preserva
  transpose: number;      // -24..+24
  velocityMin: number;    // 1..127
  velocityMax: number;    // 1..127
  fixedVelocity: number;  // 0 = dinâmica, 1..127 = fixa
  allowNotes: boolean;
  allowControlChange: boolean;
  allowProgramChange: boolean;
  allowPitchBend: boolean;
}

export interface MidiLogEntry {
  id: string;
  timestamp: string;
  type: string;
  channel: number;
  note: number;
  noteName: string;
  velocity: number;
  bytesHex: string;
  direction: 'RX' | 'TX';
  source?: string;
}
