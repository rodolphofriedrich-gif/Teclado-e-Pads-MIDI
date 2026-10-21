import React from 'react';

interface StudioFaderProps {
  label: string;
  sublabel?: string;
  value: number;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  unit?: string;
}

export function StudioFader({
  label,
  sublabel,
  value,
  max = 127,
  min = 0,
  onChange,
  onCommit,
  unit = ''
}: StudioFaderProps) {

  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  const getLedColor = () => {
    if (percent > 85) return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
    if (percent > 65) return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]';
    if (percent > 35) return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]';
    return 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]';
  };

  return (
    // Reduzido para w-[72px] para caber 4 lado a lado
    <div className="flex flex-col items-center gap-1 p-1.5 bg-[#0f172a] border border-[#1e293b] rounded-lg shadow-lg w-full max-w-[72px] mx-auto">
      
      {/* Cabeçalho do Fader */}
      <div className="text-center w-full mb-0.5">
        <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-300 truncate">{label}</span>
        {sublabel && <span className="block text-[8px] text-slate-500">{sublabel}</span>}
      </div>

      {/* Área do Fader Vertical (Altura reduzida) */}
      <div className="relative h-36 w-full flex justify-center select-none">
        
        {/* Trilho de Fundo (Sulco) - Mais fino */}
        <div className="absolute top-2 bottom-2 w-1.5 bg-[#0a0f1c] rounded-full border border-[#1e293b] overflow-hidden shadow-inner">
          <div 
            className={`absolute bottom-0 w-full rounded-full transition-all duration-75 ease-out ${getLedColor()}`}
            style={{ height: `${percent}%` }}
          />
        </div>

        {/* Marcações de Escala (Ticks) - Mais discretos */}
        <div className="absolute top-2 bottom-2 right-0 w-1 flex flex-col justify-between">
          {[0, 32, 64, 96, 127].map((tick) => (
            <div key={tick} className="w-1 h-px bg-slate-600/40" />
          ))}
        </div>

        {/* Input Invisível */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
          onKeyUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize z-20"
          style={{
            WebkitAppearance: 'slider-vertical',
            writingMode: 'vertical-lr',
            direction: 'rtl'
          }}
        />

        {/* Cabo do Fader - Menor mas ainda confortável */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-7 h-7 bg-gradient-to-b from-slate-500 to-slate-800 border border-slate-400/80 rounded shadow-[0_2px_6px_rgba(0,0,0,0.6)] z-10 pointer-events-none flex flex-col items-center justify-center gap-0.5"
          style={{ bottom: `calc(${percent}% - 14px)` }}
        >
          <div className="w-4 h-[1.5px] bg-slate-900/90 shadow-[0_1px_0_rgba(255,255,255,0.2)]" />
          <div className="w-4 h-[1.5px] bg-slate-900/90 shadow-[0_1px_0_rgba(255,255,255,0.2)]" />
        </div>
      </div>

      {/* Visor do Valor */}
      <div className="w-full mt-1 bg-[#0a0f1c] border border-[#1e293b] rounded py-0.5 text-center shadow-inner">
        <span className="font-mono text-[11px] font-bold text-cyan-400">
          {value}
          <span className="text-[8px] text-slate-500 ml-0.5">{unit}</span>
        </span>
      </div>
    </div>
  );
}
