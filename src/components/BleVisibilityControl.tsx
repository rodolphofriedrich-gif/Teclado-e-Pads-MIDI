import React from 'react';

/**
 * O Android MIDI usa o MidiManager como camada de transporte.
 * Este componente foi mantido apenas como marcador de compatibilidade visual.
 * Ele não tenta anunciar o telefone como periférico BLE, porque isso não é
 * necessário para conectar um controlador MIDI BLE ao aplicativo.
 */
export const BleVisibilityControl: React.FC = () => null;
