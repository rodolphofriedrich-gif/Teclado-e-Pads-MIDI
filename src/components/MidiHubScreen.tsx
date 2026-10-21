import React, { useState } from 'react';
import { MidiDestination } from '../types/midi';
import { 
  Network, 
  RefreshCw, 
  Download, 
  Upload, 
  Keyboard, 
  CheckCircle2, 
  Circle,
  Unplug
} from 'lucide-react';

interface MidiHubScreenProps {
  destinations: MidiDestination[];
  connectedDestination: MidiDestination | null;
  onConnect: (dest: MidiDestination) => void;
  onDisconnect: () => void;
  onRefresh: () => Promise<void> | void;
}

export function MidiHubScreen({
  destinations,
  connectedDestination,
  onConnect,
  onDisconnect,
  onRefresh,
}: MidiHubScreenProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVirtualKeyboardActive, setIsVirtualKeyboardActive] = useState(true);
  const [selectedInputId, setSelectedInputId] = useState<string>('virtual-main');

  // CORREÇÃO: Removido o 'virtual' do filtro para não duplicar o Teclado Virtual na lista
  const inputDevices = destinations.filter(d => d.type === 'usb' || d.type === 'local');

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  return (
    <div className="flex-1 w-full bg-[#0a0f1c] p-3 sm:p-5 flex flex-col gap-4 text-slate-100 overflow-y-auto custom-scrollbar">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4 shrink-0">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <Network size={18} /> MIDI Hub & Router
          </h2>
          <p className="text-xs text-slate-400 mt-1">Direcione portas de entrada (MIDI In) para as saídas de áudio/hardware.</p>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Atualizando...' : 'Atualizar Portas'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
        
        {/* CARD DE ENTRADAS (MIDI IN) */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex flex-col shadow-lg max-h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] shrink-0">
            <span className="text-xs font-bold uppercase tracking-wide text-emerald-400 flex items-center gap-2">
              <Download size={14} /> MIDI Inputs (Origem)
            </span>
            <span className="text-[10px] font-bold bg-emerald-950/50 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/50">
              {inputDevices.length + 1} Disp.
            </span>
          </div>
          
          <div className="space-y-2 overflow-y-auto pr-1 pt-3 flex-1 custom-scrollbar">
            
            {/* Teclado Virtual */}
            <button 
              type="button"
              onClick={() => {
                setIsVirtualKeyboardActive(!isVirtualKeyboardActive);
                if (!isVirtualKeyboardActive) setSelectedInputId('virtual-main');
              }}
              className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between shadow-sm select-none active:scale-[0.99] ${
                isVirtualKeyboardActive 
                  ? 'bg-emerald-900/20 border-emerald-700/60 ring-1 ring-emerald-500/30 text-emerald-300' 
                  : 'bg-[#0a0f1c] border-[#1e293b] text-slate-500 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <Keyboard size={18} className={isVirtualKeyboardActive ? 'text-emerald-400' : 'text-slate-600'} />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Teclado Virtual</span>
                  <span className="text-[10px] opacity-80 mt-0.5">
                    {isVirtualKeyboardActive ? 'Entrada Ativa' : 'Clique para ativar'}
                  </span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${
                isVirtualKeyboardActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {isVirtualKeyboardActive ? 'Ativo' : 'Inativo'}
              </span>
            </button>

            {/* Outros dispositivos de entrada (USB / Físicos) */}
            {inputDevices.map((dev) => {
              const isSelected = selectedInputId === dev.id;
              return (
                <button
                  key={`in-${dev.id}`}
                  type="button"
                  onClick={() => {
                    setSelectedInputId(dev.id);
                    setIsVirtualKeyboardActive(false);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between shadow-sm select-none active:scale-[0.99] ${
                    isSelected
                      ? 'bg-cyan-900/20 border-cyan-700/60 ring-1 ring-cyan-500/30 text-cyan-300'
                      : 'bg-[#0a0f1c] border-[#1e293b] text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-300' : ''}`}>{dev.displayName}</span>
                    <span className="text-[10px] text-slate-500 uppercase mt-0.5">USB / Hardware In</span>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
                  ) : (
                    <Circle size={16} className="text-slate-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CARD DE SAÍDAS (MIDI OUT) */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex flex-col shadow-lg max-h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] shrink-0">
            <span className="text-xs font-bold uppercase tracking-wide text-cyan-400 flex items-center gap-2">
              <Upload size={14} /> MIDI Outputs (Destino)
            </span>
            <span className="text-[10px] font-bold bg-cyan-950/50 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/50">
              {destinations.length} Disp.
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto pr-1 pt-3 flex-1 custom-scrollbar">
            
            {/* Destino Conectado Atual */}
            {connectedDestination && (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center justify-between text-xs shadow-sm">
                <div className="flex items-center gap-3 truncate">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <div className="flex flex-col truncate">
                    <span className="font-bold text-emerald-300 truncate">{connectedDestination.displayName}</span>
                    <span className="text-[10px] text-emerald-500 mt-0.5">Conectado Atualmente</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 rounded-lg text-[10px] font-bold border border-rose-900/50 transition-colors shrink-0 ml-2"
                >
                  <Unplug size={12} /> Desconectar
                </button>
              </div>
            )}

            {/* Lista de Outros Destinos */}
            {destinations.length === 0 ? (
              <div className="text-xs text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded-xl">Nenhum destino de saída encontrado.</div>
            ) : (
              destinations.map((dest) => {
                if (connectedDestination?.id === dest.id) return null;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => onConnect(dest)}
                    className="w-full text-left p-3 rounded-xl border bg-[#0a0f1c] border-[#1e293b] hover:border-slate-600 hover:bg-slate-800 transition-all flex items-center justify-between text-slate-300 shadow-sm select-none active:scale-[0.99]"
                  >
                    <span className="text-xs font-semibold truncate pr-2">{dest.displayName}</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-800/50 px-2 py-0.5 rounded">{dest.type}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
