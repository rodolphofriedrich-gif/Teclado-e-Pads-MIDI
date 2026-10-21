import React, { useState, useEffect, useRef } from 'react';
import { MidiDestination, MidiRouteConfig } from '../types/midi';
import { midiService } from '../services/midiService';
import { ChevronDown, CheckCircle2, RefreshCw, ArrowRightLeft, Download, Upload } from 'lucide-react';

interface MidiRouterScreenProps {
  destinations: MidiDestination[];
  onRefresh: () => Promise<void> | void;
}

export function MidiRouterScreen({ destinations, onRefresh }: MidiRouterScreenProps) {
  const [config, setConfig] = useState<MidiRouteConfig>(midiService.getRouteConfig());
  const [connectedOut, setConnectedOut] = useState<MidiDestination | null>(midiService.getConnectedDestination());
  const [openDropdown, setOpenDropdown] = useState<'input' | 'output' | 'channel' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const currentConfig = midiService.getRouteConfig();
    setConfig(currentConfig);
    setConnectedOut(midiService.getConnectedDestination());
    if (currentConfig.destinationId && !destinations.find(d => d.id === currentConfig.destinationId)) {
      const updated = { ...currentConfig, destinationId: null };
      setConfig(updated);
      midiService.setRouteConfig(updated);
    }
  }, [destinations]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateConfig = (fields: Partial<MidiRouteConfig>) => {
    const updated = { ...config, ...fields };
    setConfig(updated);
    midiService.setRouteConfig(updated);
  };

  const handleInputSelect = async (inputId: string) => {
    if (inputId === 'none') {
      updateConfig({ sourceId: '', source: 'virtual' });
      await midiService.connectInput('none');
    } else {
      const source: 'virtual' | 'device' = inputId === 'virtual-main' ? 'virtual' : 'device';
      updateConfig({ sourceId: inputId, source });
      await midiService.connectInput(inputId);
    }
    setOpenDropdown(null);
  };

  const handleOutputSelect = async (destId: string | null) => {
    updateConfig({ destinationId: destId });
    if (!destId) {
      await midiService.disconnectOutput();
      setConnectedOut(null);
    } else {
      const found = destinations.find(d => d.id === destId);
      if (found) {
        await midiService.connectOutput(found);
        setConnectedOut(found);
      }
    }
    setOpenDropdown(null);
  };

  const handleNumberChange = (field: 'transpose' | 'fixedVelocity', value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    updateConfig({ [field]: numValue });
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try { await onRefresh(); } finally { setIsRefreshing(false); }
  };

  const virtualInput = { id: 'virtual-main', name: 'Teclado Virtual (NexusMIDI)' };
  const availableInputs = [
    { id: 'none', name: 'Nenhuma (Desconectado)' },
    virtualInput,
    ...destinations.map(d => ({ id: d.id, name: `${d.displayName} (${d.type.toUpperCase()})` })),
  ];
  const currentInputName = availableInputs.find(i => i.id === config.sourceId)?.name || availableInputs[0].name;
  const currentOutputName = config.destinationId
    ? destinations.find(d => d.id === config.destinationId)?.displayName || 'Desconectado'
    : 'Nenhuma (Desconectado)';

  return (
    <div className="flex-1 w-full bg-[#0a0f1c] p-3 sm:p-5 flex flex-col gap-4 text-slate-100 overflow-y-auto custom-scrollbar pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <ArrowRightLeft size={18} /> Roteador MIDI
          </h2>
          <p className="text-xs text-slate-400 mt-1">Entrada → filtros → saída com transposição e velocity fixa.</p>
        </div>
        <button onClick={handleRefreshClick} disabled={isRefreshing}
          className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-2 shrink-0 disabled:opacity-50">
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" ref={dropdownRef}>
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-3 relative z-20">
          <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-400 flex items-center gap-2">
            <Download size={14} /> Entrada (MIDI In)
          </h3>
          <div className="relative">
            <button type="button" onClick={() => setOpenDropdown(openDropdown === 'input' ? null : 'input')}
              className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg p-2.5 text-xs text-emerald-200 font-semibold flex items-center justify-between hover:border-slate-500 transition">
              <span className="truncate">{currentInputName}</span>
              <ChevronDown size={16} className={`transition-transform text-slate-400 ${openDropdown === 'input' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'input' && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                {availableInputs.map((input) => (
                  <button key={input.id} onClick={() => void handleInputSelect(input.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800 transition border-b border-slate-800/50 last:border-0 ${config.sourceId === input.id ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}>
                    <span className="truncate pr-2">{input.name}</span>
                    {config.sourceId === input.id && <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className={`inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${config.sourceId && config.sourceId !== 'none' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.sourceId && config.sourceId !== 'none' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            {config.sourceId && config.sourceId !== 'none' ? 'Ouvindo' : 'Inativo'}
          </span>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-3 relative z-10">
          <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-400 flex items-center gap-2">
            <Upload size={14} /> Saída (MIDI Out)
          </h3>
          <div className="relative">
            <button type="button" onClick={() => setOpenDropdown(openDropdown === 'output' ? null : 'output')}
              className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg p-2.5 text-xs text-cyan-200 font-semibold flex items-center justify-between hover:border-slate-500 transition">
              <span className="truncate">{currentOutputName}</span>
              <ChevronDown size={16} className={`transition-transform text-slate-400 ${openDropdown === 'output' ? 'rotate-180' : ''}`} />
            </button>
            {openDropdown === 'output' && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                <button onClick={() => void handleOutputSelect(null)}
                  className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800 transition border-b border-slate-800/50 ${!config.destinationId ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}>
                  <span>Nenhuma (Desconectado)</span>
                  {!config.destinationId && <CheckCircle2 size={14} className="text-cyan-400" />}
                </button>
                {destinations.map((dest) => (
                  <button key={dest.id} onClick={() => void handleOutputSelect(dest.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800 transition border-b border-slate-800/50 last:border-0 ${config.destinationId === dest.id ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}>
                    <span className="truncate pr-2">{dest.displayName} <span className="opacity-50 text-[9px]">({dest.type.toUpperCase()})</span></span>
                    {config.destinationId === dest.id && <CheckCircle2 size={14} className="text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className={`inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${connectedOut ? 'bg-cyan-900/30 text-cyan-400 border-cyan-800/50' : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connectedOut ? 'bg-cyan-400' : 'bg-slate-500'}`} />
            {connectedOut ? `Conectado a ${connectedOut.displayName}` : 'Desconectado'}
          </span>
        </div>
      </div>

      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="flex flex-col gap-2 relative">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Filtro de Canal</label>
          <button type="button" onClick={() => setOpenDropdown(openDropdown === 'channel' ? null : 'channel')}
            className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 flex items-center justify-between hover:border-slate-500 transition">
            <span>{config.inputChannel === 0 ? 'Omni (Todos)' : `Canal ${config.inputChannel}`}</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${openDropdown === 'channel' ? 'rotate-180' : ''}`} />
          </button>
          {openDropdown === 'channel' && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
              <button onClick={() => { updateConfig({ inputChannel: 0 }); setOpenDropdown(null); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 border-b border-slate-800/50 ${config.inputChannel === 0 ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}>
                Omni (Todos)
              </button>
              {Array.from({ length: 16 }, (_, i) => {
                const ch = i + 1;
                return (
                  <button key={ch} onClick={() => { updateConfig({ inputChannel: ch }); setOpenDropdown(null); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 border-b border-slate-800/50 last:border-0 ${config.inputChannel === ch ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}>
                    Canal {ch}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Transposição</label>
          <input type="number" min={-24} max={24} value={config.transpose === 0 ? '' : config.transpose}
            onChange={(e) => handleNumberChange('transpose', e.target.value)}
            placeholder="0"
            className="bg-[#0a0f1c] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500 transition" />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Velocity Fixa</label>
          <input type="number" min={0} max={127} value={config.fixedVelocity === 0 ? '' : config.fixedVelocity}
            onChange={(e) => handleNumberChange('fixedVelocity', e.target.value)}
            placeholder="0 = dinâmica"
            className="bg-[#0a0f1c] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500 transition" />
        </div>

        <div className="flex flex-col gap-3 justify-center">
          <label className="flex items-center gap-3 text-xs font-medium text-slate-300 cursor-pointer">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${!config.allowControlChange ? 'bg-cyan-600 border-cyan-500' : 'bg-[#0a0f1c] border-slate-600'}`}>
              {!config.allowControlChange && <CheckCircle2 size={14} className="text-white" />}
            </div>
            <input type="checkbox" className="hidden" checked={!config.allowControlChange} onChange={(e) => updateConfig({ allowControlChange: !e.target.checked })} />
            Bloquear CC
          </label>
          <label className="flex items-center gap-3 text-xs font-medium text-slate-300 cursor-pointer">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${!config.allowPitchBend ? 'bg-cyan-600 border-cyan-500' : 'bg-[#0a0f1c] border-slate-600'}`}>
              {!config.allowPitchBend && <CheckCircle2 size={14} className="text-white" />}
            </div>
            <input type="checkbox" className="hidden" checked={!config.allowPitchBend} onChange={(e) => updateConfig({ allowPitchBend: !e.target.checked })} />
            Bloquear Pitch Bend
          </label>
        </div>
      </div>
    </div>
  );
}
