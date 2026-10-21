import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface ChannelDropdownProps {
  selectedChannel: number;
  onSelectChannel: (channel: number) => void;
}

export const ChannelDropdown: React.FC<ChannelDropdownProps> = ({
  selectedChannel,
  onSelectChannel,
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

  const handleSelect = (ch: number) => {
    onSelectChannel(ch);
    setIsOpen(false);
  };

  return (
    <div
      className={`relative inline-block text-left ${isOpen ? 'z-[100]' : 'z-20'}`}
      ref={containerRef}
    >
      {/* BOTÃO PRINCIPAL */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center justify-between gap-3 px-3.5 py-2 min-w-[130px] sm:min-w-[150px] bg-[#0a0f1c] hover:bg-[#0f172a] active:bg-slate-800 text-slate-100 rounded-lg border border-[#1e293b] shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
      >
        <span className="font-semibold text-sm tracking-wide font-mono">
          CH {String(selectedChannel).padStart(2, '0')}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* MENU SUSPENSO */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 mt-2 w-48 max-h-64 overflow-y-auto bg-[#0f172a] border border-[#1e293b] rounded-xl shadow-2xl z-[100] py-1 custom-scrollbar"
        >
          <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-[#0a0f1c]/50 rounded-t-xl">
            Selecione o Canal
          </div>
          
          <div className="flex flex-col">
            {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => {
              const isSelected = ch === selectedChannel;
              return (
                <button
                  key={ch}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(ch)}
                  className={`w-full text-left px-4 py-2.5 text-xs font-mono flex items-center justify-between transition-colors border-l-2 ${
                    isSelected
                      ? 'bg-cyan-900/30 text-cyan-400 font-bold border-cyan-500'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border-transparent'
                  }`}
                >
                  <span>Canal {String(ch).padStart(2, '0')}</span>
                  {isSelected && <Check size={14} className="text-cyan-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
