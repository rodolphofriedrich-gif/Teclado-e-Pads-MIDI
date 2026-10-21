import React from 'react';
import { Music } from 'lucide-react';

interface ChannelSelectorProps {
  selectedChannel: number;
  onSelectChannel: (channel: number) => void;
}

export const ChannelSelector: React.FC<ChannelSelectorProps> = ({
  selectedChannel,
  onSelectChannel,
}) => {
  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <label htmlFor="midi-channel-select" className="text-xs font-bold tracking-wider uppercase text-slate-300 flex items-center gap-2">
          <Music size={14} className="text-cyan-400" /> Canal MIDI de Envio
        </label>
        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-cyan-900/30 text-cyan-400 border border-cyan-800/50">
          CH {String(selectedChannel).padStart(2, '0')}
        </span>
      </div>

      {/* CORREÇÃO: grid-cols-[repeat(16,minmax(0,1fr))] evita o bug de classe inexistente no Tailwind */}
      <div className="grid grid-cols-8 sm:grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5 sm:gap-2">
        {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => {
          const isActive = ch === selectedChannel;
          return (
            <button
              key={ch}
              type="button"
              onClick={() => onSelectChannel(ch)}
              className={`py-2 text-xs font-mono font-bold rounded-lg transition-all select-none active:scale-95 border ${
                isActive
                  ? 'bg-cyan-600 text-white border-cyan-500 ring-2 ring-cyan-400/50 shadow-md shadow-cyan-900/50'
                  : 'bg-[#0a0f1c] text-slate-400 border-[#1e293b] hover:bg-slate-800 hover:text-white hover:border-slate-600'
              }`}
              title={`Selecionar Canal ${ch}`}
            >
              {String(ch).padStart(2, '0')}
            </button>
          );
        })}
      </div>
      
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Transmissão em tempo real
        </span>
        <span>Padrão: Canal 01</span>
      </div>
    </div>
  );
};
