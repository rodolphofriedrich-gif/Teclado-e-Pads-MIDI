// No topo da classe MidiService, adicione:
private activeNotesMap = new Map<number, number>(); // Mapeia noteNumber -> canal

// Altere o sendKeyboardNote:
public async sendKeyboardNote(channel: number, note: number, velocity: number, isNoteOn: boolean): Promise<{ hex: string }> {
  const safeChannel = this.clamp(Math.trunc(channel), 1, 16);
  const safeNote = this.clamp(Math.trunc(note), 0, 127);
  const safeVelocity = this.clamp(Math.trunc(velocity), 0, 127);
  
  if (isNoteOn && safeVelocity > 0) {
    this.activeNotesMap.set(safeNote, safeChannel);
  } else {
    // Ao desligar, usa o canal em que a nota foi ligada (se existir)
    const originalChannel = this.activeNotesMap.get(safeNote) || safeChannel;
    this.activeNotesMap.delete(safeNote);
    channel = originalChannel; 
  }

  const status = isNoteOn && safeVelocity > 0 ? 0x90 + channel - 1 : 0x80 + channel - 1;
  this.sendRoutedMessage(status, safeNote, safeVelocity);
  return { hex: [status, safeNote, safeVelocity].map((v) => v.toString(16).padStart(2, '0')).join(' ') };
}

// Atualize o allNotesOff para limpar o mapa:
public async allNotesOff(): Promise<void> {
  const destination = this.connectedOutput;
  if (!destination || destination.id === 'virtual-main') return;
  
  // Envia Note-Off para cada nota que estava ativa no seu respectivo canal
  for (const [note, channel] of this.activeNotesMap.entries()) {
    const status = 0x80 + channel - 1;
    await this.transmitBytesNow([status, note, 0], destination);
  }
  this.activeNotesMap.clear();

  // Segurança extra: envia CC 123 (All Notes Off) para todos os canais
  for (let ch = 1; ch <= 16; ch++) {
    await this.transmitBytesNow([0xB0 + ch - 1, 123, 0], destination);
  }
}
