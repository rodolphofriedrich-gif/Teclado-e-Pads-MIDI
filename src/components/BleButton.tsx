import React, { useEffect, useState } from 'react';
import { midiManager } from '../services/midiService';
import { Bluetooth, Loader2 } from 'lucide-react';

interface BleButtonProps {
  onBluetoothDisabledAlert: (msg: string) => void;
}

export const BleButton: React.FC<BleButtonProps> = ({ onBluetoothDisabledAlert }) => {
  const [isActive, setIsActive] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const refreshState = async () => {
    try {
      setIsActive(await midiManager.getBluetoothState());
    } catch {
      setIsActive(false);
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  const handleToggle = async () => {
    if (isBusy) return;
    setIsBusy(true);

    try {
      const enabled = await midiManager.getBluetoothState();

      if (enabled) {
        setIsActive(true);
        return;
      }

      const result = await midiManager.requestEnableBluetooth();
      setIsActive(result);

      if (!result) {
        onBluetoothDisabledAlert('O Bluetooth continua desligado. Ative-o para buscar dispositivos MIDI BLE.');
      }
    } catch (error: any) {
      setIsActive(false);
      onBluetoothDisabledAlert(error?.message || 'Não foi possível acessar o Bluetooth.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isBusy}
      title={isActive ? 'Bluetooth ativado' : 'Ativar Bluetooth'}
      className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg border tracking-wide transition-all active:scale-95 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-60 ${
        isActive
          ? 'bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-400 border-cyan-700/50 shadow-[0_0_10px_rgba(8,145,178,0.2)]'
          : 'bg-[#0f172a] hover:bg-slate-800 text-slate-400 border-[#1e293b]'
      }`}
    >
      {isBusy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Bluetooth size={14} className={isActive ? 'text-cyan-400' : 'text-slate-500'} />
      )}
      
      <span>{isBusy ? 'Ativando...' : isActive ? 'Bluetooth ON' : 'Ativar Bluetooth'}</span>
    </button>
  );
};
