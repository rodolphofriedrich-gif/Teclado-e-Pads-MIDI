import React from 'react';
import { MidiDestination } from '../types/midi';
import { Link2, RefreshCw, Radio, Smartphone, Bluetooth, CheckCircle2, Circle, Unplug } from 'lucide-react';

interface DestinationListProps {
  destinations: MidiDestination[];
  connectedDestination: MidiDestination | null;
  onConnect: (destination: MidiDestination) => void;
  onDisconnect: () => void;
  onScanBle: () => void;
  onRefresh: () => void;
  isScanningBle: boolean;
}

export const DestinationList: React.FC<DestinationListProps> = ({
  destinations,
  connectedDestination,
  onConnect,
  onDisconnect,
  onScanBle,
  onRefresh,
  isScanningBle,
}) => {
  const localDestinations = destinations.filter((d) => d.type === 'local');
  const bleDestinations = destinations.filter((d) => d.type === 'ble');

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 shadow-lg flex flex-col gap-4">
      
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#1e293b] pb-3">
        <div className="flex items-center gap-2">
          <Link2 size={16} className="text-cyan-400" />
          <span className="text-xs font-bold tracking-wider uppercase text-slate-300">
            Destinos MIDI (Conexão Exclusiva)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs px-2.5 py-1.5 bg-[#0a0f1c] hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 transition flex items-center gap-1.5 active:scale-95"
            title="Atualizar lista de receptores locais"
          >
            <RefreshCw size={12} /> Atualizar
          </button>
          <button
            type="button"
            onClick={onScanBle}
            disabled={isScanningBle}
            className="text-xs px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg font-semibold transition flex items-center gap-1.5 active:scale-95 shadow-md shadow-cyan-900/20"
          >
            <Radio size={14} className={isScanningBle ? 'animate-pulse' : ''} />
            <span>{isScanningBle ? 'Buscando...' : 'Buscar BLE'}</span>
          </button>
        </div>
      </div>

      {/* STATUS DA CONEXÃO ATIVA */}
      <div
        className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
          connectedDestination
            ? 'bg-emerald-950/30 border-emerald-800/50'
            : 'bg-[#0a0f1c] border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3 truncate">
          {connectedDestination ? (
            <CheckCircle2 size={20} className="text-emerald-400 shrink-0" />
          ) : (
            <Circle size={20} className="text-slate-600 shrink-0" />
          )}
          <div className="truncate">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
              {connectedDestination ? 'Destino Conectado' : 'Nenhum destino conectado'}
            </div>
            {connectedDestination ? (
              <div className="font-mono text-sm text-emerald-300 font-bold truncate">
                {connectedDestination.displayName}
              </div>
            ) : (
              <div className="text-xs text-amber-400/80 font-medium">
                Selecione um dispositivo abaixo para conectar
              </div>
            )}
          </div>
        </div>

        {connectedDestination && (
          <button
            type="button"
            onClick={onDisconnect}
            className="px-3 py-1.5 text-xs bg-rose-950/50 hover:bg-rose-900/60 text-rose-400 border border-rose-900/50 rounded-lg font-bold transition flex items-center gap-1.5 active:scale-95 shrink-0"
          >
            <Unplug size={14} /> Desconectar
          </button>
        )}
      </div>

      {/* LISTAS */}
      <div className="space-y-5">
        
        {/* CATEGORIA A: LOCAL */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <Smartphone size={14} className="text-emerald-500" /> 
            Neste aparelho (Receptores Instalados)
          </div>
          
          {localDestinations.length === 0 ? (
            <div className="p-4 bg-[#0a0f1c] rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 text-center">
              Nenhum aplicativo receptor MIDI local detectado.<br/>Inicie um sintetizador/DAW no Android.
            </div>
          ) : (
            <div className="space-y-2">
              {localDestinations.map((dest) => {
                const isConnected = connectedDestination?.id === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => {
                      if (isConnected) onDisconnect();
                      else onConnect(dest);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between select-none active:scale-[0.98] ${
                      isConnected
                        ? 'bg-emerald-900/20 border-emerald-700/60 ring-1 ring-emerald-500/30'
                        : 'bg-[#0a0f1c] hover:bg-slate-800/80 border-[#1e293b]'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      {isConnected ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Circle size={16} className="text-slate-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <div className={`text-xs font-semibold truncate ${isConnected ? 'text-emerald-300' : 'text-slate-200'}`}>
                          {dest.displayName}
                        </div>
                        {dest.manufacturer && (
                          <div className="text-[10px] text-slate-500 truncate mt-0.5">
                            {dest.manufacturer} {dest.isVirtual ? '• Emulação local' : '• MidiManager'}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md whitespace-nowrap ml-2 ${
                        isConnected
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isConnected ? 'Ativo' : 'Conectar'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CATEGORIA B: BLE */}
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <Bluetooth size={14} className="text-cyan-500" /> 
            Dispositivos BLE (Bluetooth MIDI Externo)
          </div>
          
          {bleDestinations.length === 0 ? (
            <div className="p-4 bg-[#0a0f1c] rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 text-center">
              Nenhum dispositivo BLE pareado.<br/>Toque em "Buscar BLE" para escanear.
            </div>
          ) : (
            <div className="space-y-2">
              {bleDestinations.map((dest) => {
                const isConnected = connectedDestination?.id === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => {
                      if (isConnected) onDisconnect();
                      else onConnect(dest);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between select-none active:scale-[0.98] ${
                      isConnected
                        ? 'bg-cyan-900/20 border-cyan-700/60 ring-1 ring-cyan-500/30'
                        : 'bg-[#0a0f1c] hover:bg-slate-800/80 border-[#1e293b]'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      {isConnected ? (
                        <CheckCircle2 size={16} className="text-cyan-400 shrink-0" />
                      ) : (
                        <Circle size={16} className="text-slate-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <div className={`text-xs font-semibold truncate ${isConnected ? 'text-cyan-300' : 'text-slate-200'}`}>
                          {dest.displayName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          Bluetooth Low Energy MIDI
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md whitespace-nowrap ml-2 ${
                        isConnected
                          ? 'bg-cyan-500/20 text-cyan-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isConnected ? 'Ativo' : 'Conectar'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
