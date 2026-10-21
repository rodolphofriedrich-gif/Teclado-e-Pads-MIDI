import React, { useEffect, useState, useRef } from 'react';
import { MidiLogEntry } from '../types/midi';
import { midiManager, getNoteName } from '../services/midiService';
import { ChevronDown, Pause, Play, Trash2 } from 'lucide-react';

interface Props {
  maxEntries?: number;
}

export function MidiMonitorScreen({ maxEntries = 150 }: Props) {
  const [entries, setEntries] = useState<MidiLogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<'all' | 'RX' | 'TX'>('all');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  // Ref para evitar recriar o listener a cada pausa
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Fecha o menu customizado ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const listener = (message: {
      status: number;
      data1: number;
      data2: number;
      timestamp: number;
      sourceId?: string;
    }) => {
      // CORREÇÃO DE PERFORMANCE: Usa a ref em vez do estado direto, evitando recriar o listener
      if (pausedRef.current) return;

      const status = message.status & 0xff;
      const command = status & 0xf0;
      const channel = command >= 0xf0 ? 0 : (status & 0x0f) + 1;

      let type: MidiLogEntry['type'] = 'Unknown';

      switch (command) {
        case 0x80: type = 'Note Off'; break;
        case 0x90: type = message.data2 === 0 ? 'Note Off' : 'Note On'; break;
        case 0xa0: type = 'Poly Aftertouch'; break;
        case 0xb0: type = 'Control Change'; break;
        case 0xc0: type = 'Program Change'; break;
        case 0xd0: type = 'Channel Pressure'; break;
        case 0xe0: type = 'Pitch Bend'; break;
        default: type = 'System';
      }

      const bytes = [status, message.data1, message.data2];
      const bytesHex = bytes
        .map((value) => (value & 0xff).toString(16).padStart(2, '0'))
        .join(' ');

      const entry: MidiLogEntry = {
        id: `${message.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date(message.timestamp).toLocaleTimeString(),
        type,
        channel,
        note: message.data1,
        noteName: getNoteName(message.data1),
        velocity: message.data2,
        bytesHex,
        direction: 'RX', // Nota: Se o midiManager enviar TX por aqui também, isso precisaria ser dinâmico
        source: message.sourceId,
      };

      setEntries((current) => [entry, ...current].slice(0, maxEntries));
    };

    midiManager.addMessageListener(listener);

    return () => {
      midiManager.removeMessageListener(listener);
    };
  }, [maxEntries]); // Removido 'paused' das dependências

  const visible =
    filter === 'all'
      ? entries
      : entries.filter((entry) => entry.direction === filter);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#0a0f1c] text-slate-100 rounded-xl border border-slate-800 overflow-hidden">
      
      {/* CABEÇALHO */}
      <div className="px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-fuchsia-400">
            MIDI Monitor
          </h2>
          <p className="text-[10px] text-slate-500">
            Mensagens MIDI recebidas pelo NexusMIDI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          
          {/* FILTRO CUSTOMIZADO */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex h-[30px] min-w-[110px] items-center justify-between rounded-md border border-slate-700 bg-[#0f172a] px-2.5 text-xs text-slate-200 outline-none hover:border-slate-600 transition"
            >
              <span>
                {filter === 'all' ? 'Todas' : filter === 'RX' ? 'Somente RX' : 'Somente TX'}
              </span>
              <ChevronDown size={14} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 top-full mt-1 w-32 z-50 rounded-lg border border-slate-700 bg-[#0f172a] shadow-2xl overflow-hidden">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'RX', label: 'Somente RX' },
                  { id: 'TX', label: 'Somente TX' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setFilter(item.id as typeof filter); setIsFilterOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition hover:bg-slate-800 ${
                      filter === item.id ? 'bg-slate-800/50 text-cyan-400 font-bold' : 'text-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* BOTÃO PAUSAR */}
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className={`flex h-[30px] items-center gap-1.5 px-2.5 rounded-md text-xs border transition-colors ${
              paused 
                ? 'border-amber-600/50 bg-amber-900/30 text-amber-400' 
                : 'border-slate-700 bg-[#0f172a] text-slate-300 hover:bg-slate-800'
            }`}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? 'Continuar' : 'Pausar'}
          </button>

          {/* BOTÃO LIMPAR */}
          <button
            type="button"
            onClick={() => setEntries([])}
            className="flex h-[30px] items-center gap-1.5 px-2.5 rounded-md text-xs border border-slate-700 bg-[#0f172a] text-slate-300 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800/50 transition-colors"
          >
            <Trash2 size={12} />
            Limpar
          </button>
        </div>
      </div>

      {/* ÁREA DA LISTA COM ROLAGEM HORIZONTAL (Protege o layout no celular) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar">
          <div className="min-w-[580px] flex flex-col h-full">
            
            {/* CABEÇALHO DA TABELA */}
            <div className="grid grid-cols-[70px_40px_110px_1fr_40px_90px] gap-2 px-3 py-2 text-[9px] uppercase tracking-wide text-slate-500 border-b border-slate-800 shrink-0 bg-[#0a0f1c] sticky top-0 z-10">
              <span>Hora</span>
              <span>Dir</span>
              <span>Tipo</span>
              <span>Detalhes</span>
              <span>CH</span>
              <span>Bytes</span>
            </div>

            {/* LISTA */}
            <div className="flex-1">
              {visible.length === 0 ? (
                <div className="h-full min-h-[200px] flex items-center justify-center text-xs text-slate-600">
                  {paused
                    ? 'Monitoramento pausado.'
                    : 'Aguardando mensagens MIDI recebidas...'}
                </div>
              ) : (
                visible.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[70px_40px_110px_1fr_40px_90px] gap-2 px-3 py-1.5 border-b border-slate-800/50 text-[10px] font-mono hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-slate-500">{entry.timestamp}</span>
                    <span className={`font-bold ${entry.direction === 'RX' ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {entry.direction}
                    </span>
                    <span className="text-slate-300 truncate">{entry.type}</span>
                    <span className="text-slate-400 truncate">
                      {entry.type.includes('Note')
                        ? `${entry.noteName} • Vel ${entry.velocity}`
                        : `Val: ${entry.velocity}`}
                    </span>
                    <span className="text-slate-500">{entry.channel}</span>
                    <span className="text-slate-500 truncate">{entry.bytesHex}</span>
                  </div>
                ))
              )}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
