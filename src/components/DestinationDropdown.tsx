import React, { useState, useRef, useEffect } from 'react';
import { MidiDestination } from '../types/midi';
import { ChevronDown, CheckCircle2, Circle, RefreshCw, Usb, Bluetooth, Radio, X } from 'lucide-react';

interface DestinationDropdownProps {
  destinations: MidiDestination[];
  connectedDestination: MidiDestination | null;
  onConnect: (destination: MidiDestination) => void;
  onDisconnect: () => void;
  onScanBle: () => void;
  onRefresh: () => void;
  isScanningBle: boolean;
}

export const DestinationDropdown: React.FC<DestinationDropdownProps> = ({
  destinations,
  connectedDestination,
  onConnect,
  onDisconnect,
  onScanBle,
  onRefresh,
  isScanningBle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      onRefresh();
    }
  };

  const handleSelect = (dest: MidiDestination) => {
    onConnect(dest);
    setIsOpen(false);
  };

  const handleDisconnectClick = () => {
    onDisconnect();
    setIsOpen(false);
  };

  // Separa os destinos entre USB/Virtual e BLE com base no tipo
  const usbDestinations = destinations.filter((dest) => dest.type === 'usb' || dest.type === 'virtual');
  const bleDestinations = destinations.filter((dest) => dest.type === 'ble');

  return (
    <div
      className={`relative inline-block text-left ${isOpen ? 'z-[100]' : 'z-20'}`}
      ref={containerRef}
    >
      {/* Botão Principal */}
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex items-center justify-between gap-2.5 px-3 py-2 min-w-[160px] sm:min-w-[200px] max-w-[260px] sm:max-w-[340px] rounded-lg border text-left shadow-sm transition-all focus:outline-none focus:ring-2 ${
          connectedDestination
            ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-700/60 text-emerald-300 focus:ring-emerald-500/50'
            : 'bg-[#0f172a] hover:bg-slate-800 border-slate-700 text-slate-300 focus:ring-slate-500/50'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {connectedDestination ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : (
            <Circle size={16} className="text-slate-500 shrink-0" />
          )}
          <span className="truncate text-xs sm:text-sm font-semibold">
            {connectedDestination ? connectedDestination.displayName : 'Desconectado'}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu Suspenso */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-[280px] sm:w-[320px] max-h-[75vh] overflow-y-auto bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl z-[100] divide-y divide-[#1e293b] custom-scrollbar"
        >
          {/* Cabeçalho */}
          <div className="px-3 py-2 flex items-center justify-between gap-2 bg-[#0a0f1c] rounded-t-xl">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Gerenciar Conexões
            </span>
            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="Atualizar lista de dispositivos"
            >
              <RefreshCw size={12} /> Atualizar
            </button>
          </div>

          {/* Opção de Desconectar */}
          {connectedDestination && (
            <div className="p-2 bg-[#0f172a]">
              <button
                type="button"
                onClick={handleDisconnectClick}
                className="w-full text-left px-3 py-2 text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/50 rounded-lg flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <X size={14} /> Desconectar destino atual
                </span>
              </button>
            </div>
          )}

          {/* SEÇÃO 1: Dispositivos USB / Locais */}
          <div className="py-1">
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/20 flex items-center gap-1.5">
              <Usb size={12} /> USB / Locais ({usbDestinations.length})
            </div>
            {usbDestinations.length === 0 ? (
              <div className="px-4 py-2 text-[11px] text-slate-500 italic">
                Nenhum dispositivo USB.
              </div>
            ) : (
              usbDestinations.map((dest) => {
                const isSelected = connectedDestination?.id === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => handleSelect(dest)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-900/30 text-emerald-300 border-l-2 border-emerald-500'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate font-semibold flex items-center gap-1.5">
                        {dest.displayName}
                      </div>
                      {dest.manufacturer && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {dest.manufacturer}
                        </div>
                      )}
                    </div>
                    {isSelected ? (
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Circle size={14} className="text-slate-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* SEÇÃO 2: Dispositivos Bluetooth BLE */}
          <div className="py-1">
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-cyan-400 bg-cyan-950/20 flex items-center gap-1.5">
              <Bluetooth size={12} /> Bluetooth BLE ({bleDestinations.length})
            </div>
            {bleDestinations.length === 0 ? (
              <div className="px-4 py-2 text-[11px] text-slate-500 italic">
                Nenhum dispositivo BLE pareado.
              </div>
            ) : (
              bleDestinations.map((dest) => {
                const isSelected = connectedDestination?.id === dest.id;
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => handleSelect(dest)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-cyan-900/30 text-cyan-300 border-l-2 border-cyan-500'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate font-semibold flex items-center gap-1.5">
                        {dest.displayName}
                      </div>
                      {dest.manufacturer && (
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {dest.manufacturer}
                        </div>
                      )}
                    </div>
                    {isSelected ? (
                      <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                    ) : (
                      <Circle size={14} className="text-slate-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Botão de Busca BLE */}
          <div className="p-2 bg-[#0a0f1c] rounded-b-xl">
            <button
              type="button"
              onClick={onScanBle}
              disabled={isScanningBle}
              className={`w-full text-left px-3 py-2 text-xs font-bold border rounded-lg flex items-center justify-between transition-colors ${
                isScanningBle 
                  ? 'text-slate-400 bg-slate-800 border-slate-700 cursor-wait' 
                  : 'text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-800/50'
              }`}
            >
              <span className="flex items-center gap-2">
                <Radio size={14} className={isScanningBle ? 'animate-pulse' : ''} />
                {isScanningBle ? 'Buscando dispositivos...' : 'Buscar dispositivo BLE'}
              </span>
              <span className="text-[9px] uppercase font-bold opacity-70">Scan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
