import React, { useState, useEffect, useRef } from 'react';
import { MidiDestination, MidiRouteConfig } from '../types/midi';
import { midiService } from '../services/midiService';
import { ChevronDown, CheckCircle2, RefreshCw, ArrowRightLeft, Download, Upload } from 'lucide-react';

interface MidiRouterScreenProps {
  destinations: MidiDestination[];
  onRefresh: () => Promise<void>;
}

export function MidiRouterScreen({ destinations, onRefresh }: MidiRouterScreenProps) {
  const [config, setConfig] = useState<MidiRouteConfig>(midiService.getRouteConfig());
  const [connectedOut, setConnectedOut] = useState<MidiDestination | null>(midiService.getConnectedDestination());
  
  const [openDropdown, setOpenDropdown] = useState<'input' | 'output' | 'channel' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // NOVO: Estado de carregamento para o botão Atualizar
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const currentConfig = midiService.getRouteConfig();
    setConfig(currentConfig);
    
    const currentOut = midiService.getConnectedDestination();
    setConnectedOut(currentOut);

    // NOVO: Se o aparelho de saída foi desconectado fisicamente, limpa o estado visual
    if (currentConfig.outputId && !destinations.find(d => d.id === currentConfig.outputId)) {
      const updated = { ...currentConfig, outputId: null };
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

  const updateConfig = (newFields: Partial<MidiRouteConfig>) => {
    const updated = { ...config, ...newFields };
    setConfig(updated);
    midiService.setRouteConfig(updated);
  };

  const handleInputSelect = async (inputId: string) => {
    updateConfig({ inputId });
    await midiService.connectInput(inputId);
    setOpenDropdown(null);
  };

  const handleOutputSelect = async (destId: string | null) => {
    updateConfig({ outputId: destId });
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

  // NOVO: Função para envolver o onRefresh com estado de loading
  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const virtualInput = { id: 'virtual-main', name: 'Teclado Virtual (NexusMIDI Pro)' };
  const availableInputs = [
    { id: 'none', name: 'Nenhuma (Desconectado)' },
    virtualInput,
    ...destinations.filter(d => d.type !== 'virtual').map(d => ({ id: d.id, name: `${d.displayName} (${d.type.toUpperCase()})` }))
  ];
  
  const currentInputName = availableInputs.find(i => i.id === config.inputId)?.name || availableInputs[0].name;
  const currentOutputName = config.outputId ? destinations.find(d => d.id === config.outputId)?.displayName : 'Nenhuma (Desconectado)';

  return (
    <div className="flex-1 w-full bg-[#0a0f1c] p-3 sm:p-5 flex flex-col gap-4 text-slate-100 overflow-y-auto custom-scrollbar pb-32">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
            <ArrowRightLeft size={18} /> Roteador MIDI Avançado
          </h2>
          <p className="text-xs text-slate-400 mt-1">Configure entradas, saídas, canais, transposição e filtros independentes.</p>
        </div>
        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="px-3 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-cyan-300 rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-2 shrink-0 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> 
          {isRefreshing ? 'Atualizando...' : 'Atualizar Dispositivos'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" ref={dropdownRef}>
        
        {/* ENTRADA (MIDI IN) */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-4 relative z-20">
          <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-400 flex items-center gap-2">
            <Download size={14} /> Porta de Entrada (MIDI In)
          </h3>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'input' ? null : 'input')}
              className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg p-2.5 text-xs text-emerald-200 font-semibold flex items-center justify-between hover:border-slate-500 transition"
            >
              <span className="truncate">{currentInputName}</span>
              <ChevronDown size={16} className={`transition-transform text-slate-400 ${openDropdown === 'input' ? 'rotate-180' : ''}`} />
            </button>
            
            {openDropdown === 'input' && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                {availableInputs.map((input) => (
                  <button
                    key={input.id}
                    onClick={() => handleInputSelect(input.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800 transition border-b border-slate-800/50 last:border-0 ${config.inputId === input.id ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}
                  >
                    <span className="truncate pr-2">{input.name}</span>
                    {config.inputId === input.id && <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* NOVO: Badge de status visual */}
          <div className="flex">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${config.inputId !== 'none' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50' : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.inputId !== 'none' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
              {config.inputId !== 'none' ? 'Ativo e Ouvindo' : 'Inativo'}
            </span>
          </div>
        </div>

        {/* SAÍDA (MIDI OUT) */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 flex flex-col gap-4 relative z-10">
          <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-400 flex items-center gap-2">
            <Upload size={14} /> Porta de Saída (MIDI Out)
          </h3>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'output' ? null : 'output')}
              className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg p-2.5 text-xs text-cyan-200 font-semibold flex items-center justify-between hover:border-slate-500 transition"
            >
              <span className="truncate">{currentOutputName}</span>
              <ChevronDown size={16} className={`transition-transform text-slate-400 ${openDropdown === 'output' ? 'rotate-180' : ''}`} />
            </button>
            
            {openDropdown === 'output' && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => handleOutputSelect(null)}
                  className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800 transition border-b border-slate-800/50 ${!config.outputId ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}
                >
                  <span className="truncate pr-2">Nenhuma (Desconectado)</span>
                  {!config.outputId && <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />}
                </button>
                {destinations.map((dest) => (
                  <button
                    key={dest.id}
                    onClick={() => handleOutputSelect(dest.id)}
                    className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-slate-800 transition border-b border-slate-800/50 last:border-0 ${config.outputId === dest.id ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}
                  >
                    <span className="truncate pr-2">{dest.displayName} <span className="opacity-50 text-[9px]">({dest.type.toUpperCase()})</span></span>
                    {config.outputId === dest.id && <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* NOVO: Badge de status visual */}
          <div className="flex">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${connectedOut ? 'bg-cyan-900/30 text-cyan-400 border-cyan-800/50' : 'bg-slate-800/50 text-slate-500 border-slate-700'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connectedOut ? 'bg-cyan-400' : 'bg-slate-500'}`}></span>
              {connectedOut ? `Conectado a ${connectedOut.displayName}` : 'Desconectado'}
            </span>
          </div>
        </div>
      </div>

      {/* FILTROS E PARÂMETROS */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-2">
        
        {/* Filtro de Canal (Abre para CIMA) */}
        <div className="flex flex-col gap-2 relative">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Filtro de Canal</label>
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === 'channel' ? null : 'channel')}
            className="w-full bg-[#0a0f1c] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 flex items-center justify-between hover:border-slate-500 transition"
          >
            <span>{config.channelFilter === 0 ? 'Omni (Todos)' : `Canal ${config.channelFilter}`}</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${openDropdown === 'channel' ? 'rotate-180' : ''}`} />
          </button>
          
          {openDropdown === 'channel' && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#0f172a] border border-slate-700 rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar">
              <button
                onClick={() => { updateConfig({ channelFilter: 0 }); setOpenDropdown(null); }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 border-b border-slate-800/50 ${config.channelFilter === 0 ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}
              >
                Omni (Todos)
              </button>
              {Array.from({ length: 16 }, (_, i) => {
                const ch = i + 1;
                return (
                  <button
                    key={ch}
                    onClick={() => { updateConfig({ channelFilter: ch }); setOpenDropdown(null); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 border-b border-slate-800/50 last:border-0 ${config.channelFilter === ch ? 'text-cyan-400 bg-slate-800/50' : 'text-slate-300'}`}
                  >
                    Canal {ch}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Transposição */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Transposição (Semitons)</label>
          <input
            type="number"
            min="-24"
            max="24"
            value={config.transpose === 0 ? '' : config.transpose}
            onChange={(e) => handleNumberChange('transpose', e.target.value)}
            className="bg-[#0a0f1c] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500 transition"
            placeholder="0"
          />
        </div>

        {/* Velocity Fixa */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Velocity Fixa</label>
          <input
            type="number"
            min="0"
            max="127"
            value={config.fixedVelocity === 0 ? '' : config.fixedVelocity}
            onChange={(e) => handleNumberChange('fixedVelocity', e.target.value)}
            className="bg-[#0a0f1c] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 outline-none focus:border-cyan-500 transition"
            placeholder="0 = Dinâmica"
          />
        </div>

        {/* Filtros (Checkboxes customizados) */}
        <div className="flex flex-col gap-3 justify-center pt-2 sm:pt-0">
          <label className="flex items-center gap-3 text-xs font-medium text-slate-300 cursor-pointer group">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${config.filterCC ? 'bg-cyan-600 border-cyan-500' : 'bg-[#0a0f1c] border-slate-600 group-hover:border-slate-400'}`}>
              {config.filterCC && <CheckCircle2 size={14} className="text-white" />}
            </div>
            <input type="checkbox" className="hidden" checked={config.filterCC} onChange={(e) => updateConfig({ filterCC: e.target.checked })} />
            Bloquear Control Change (CC)
          </label>
          
          <label className="flex items-center gap-3 text-xs font-medium text-slate-300 cursor-pointer group">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${config.filterPitchBend ? 'bg-cyan-600 border-cyan-500' : 'bg-[#0a0f1c] border-slate-600 group-hover:border-slate-400'}`}>
              {config.filterPitchBend && <CheckCircle2 size={14} className="text-white" />}
            </div>
            <input type="checkbox" className="hidden" checked={config.filterPitchBend} onChange={(e) => updateConfig({ filterPitchBend: e.target.checked })} />
            Bloquear Pitch Bend
          </label>
        </div>
      </div>
    </div>
  );
}
