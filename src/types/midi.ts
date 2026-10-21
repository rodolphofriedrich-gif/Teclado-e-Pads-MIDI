/** Tipos usados pelo controlador MIDI. */

export type DestinationType = 'local' | 'ble' | 'usb' | 'virtual' | 'unknown';

export interface MidiDestination {
  id: string;
  name: string;
  type: DestinationType;
  displayName: string;
  manufacturer?: string;
  portCount?: number;
  inputPortCount?: number;
  outputPortCount?: number;
  nativeId?: number;
  bleAddress?: string;
}

export type MidiMessageType =
  | 'Note On'
  | 'Note Off'
  | 'Control Change'
  | 'Program Change'
  | 'Pitch Bend'
  | 'Channel Pressure'
  | 'Poly Aftertouch'
  | 'System'
  | 'Unknown';

export interface MidiLogEntry {
  id: string;
  timestamp: string;
  type: MidiMessageType;
  channel: number;
  note: number;
  noteName: string;
  velocity: number;
  bytesHex: string;
  direction?: 'RX' | 'TX';
  source?: string;
}

export interface MidiMessage {
  status: number;
  data1: number;
  data2: number;
  timestamp: number;
  sourceId?: string;
}

export interface MidiRouteConfig {
  enabled: boolean;

  /** Origem das mensagens encaminhadas pelo roteador. */
  source: 'virtual' | 'device';

  /** Identificador da entrada física selecionada. */
  sourceId?: string | null;

  /** Identificador da saída MIDI selecionada. */
  destinationId: string | null;

  /** Canal de entrada (0 = Omni / Todos). */
  inputChannel: number;
  
  /** Canal de saída (0 = Manter o mesmo da entrada). */
  outputChannel: number;

  transpose: number;
  velocityMin: number;
  velocityMax: number;
  
  allowNotes: boolean;
  allowControlChange: boolean;
  allowProgramChange: boolean;
  allowPitchBend: boolean;
}
