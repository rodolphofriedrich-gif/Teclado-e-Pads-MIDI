import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface MidiPadGridProps {
  isActive: boolean;
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  onDisabledPress: () => void;
  onActivity?: (velocity: number) => void;
  selectedChannel: number;
  onSelectChannel: (channel: number) => void;
  selectedVelocity: number;
  onSelectVelocity: (velocity: number) => void;
}

const ALL_PADS = [
  { id: 36, label: 'Bumbo', color: 'bg-blue-500', border: 'border-blue-500/30' },
  { id: 38, label: 'Caixa', color: 'bg-red-500', border: 'border-red-500/30' },
  { id: 42, label: 'Chimbal Fech.', color: 'bg-yellow-500', border: 'border-yellow-500/30' },
  { id: 46, label: 'Chimbal Aber.', color: 'bg-yellow-400', border: 'border-yellow-400/30' },
  { id: 41, label: 'Tom Grave', color: 'bg-green-500', border: 'border-green-500/30' },
  { id: 45, label: 'Tom Médio', color: 'bg-green-400', border: 'border-green-400/30' },
  { id: 48, label: 'Tom Agudo', color: 'bg-green-300', border: 'border-green-300/30' },
  { id: 50, label: 'Tom Alto', color: 'bg-teal-500', border: 'border-teal-500/30' },
  { id: 49, label: 'Prato Crash', color: 'bg-cyan-500', border: 'border-cyan-500/30' },
  { id: 51, label: 'Prato Ride', color: 'bg-cyan-400', border: 'border-cyan-400/30' },
  { id: 39, label: 'Palmas', color: 'bg-orange-500', border: 'border-orange-500/30' },
  { id: 56, label: 'Cabaça', color: 'bg-amber-500', border: 'border-amber-500/30' },
  { id: 54, label: 'Pandeiro', color: 'bg-pink-500', border: 'border-pink-500/30' },
  { id: 60, label: 'Bongo Agudo', color: 'bg-purple-500', border: 'border-purple-500/30' },
  { id: 61, label: 'Bongo Grave', color: 'bg-purple-400', border: 'border-purple-400/30' },
  { id: 76, label: 'Madeira', color: 'bg-stone-500', border: 'border-stone-500/30' },
];

const VELOCITIES = [30, 64, 100, 127];

export function MidiPadGrid({ 
  isActive, onNoteOn, onNoteOff, onDisabledPress, onActivity,
  selectedChannel, onSelectChannel, selectedVelocity, onSelectVelocity
}: MidiPadGridProps) {
  const [activePreset, setActivePreset] = useState<1 | 2>(1);
  const [pressedPads, setPressedPads] = useState<Set<number>>(() => new Set());
  const activePointersRef = useRef<Map<number, number>>(new Map());
  const activeNotesRef = useRef<Set<number>>(new Set());

  // Estados dos Dropdowns customizados
  const [isVelocityOpen, setIsVelocityOpen] = useState(false);
  const [isChannelOpen, setIsChannelOpen] = useState(false);
  const velocityRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);

  const onNoteOffRef = useRef(onNoteOff);
  useEffect(() => { onNoteOffRef.current = onNoteOff; }, [onNoteOff]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (velocityRef.current && !velocityRef.current.contains(event.target as Node)) {
        setIsVelocityOpen(false);
      }
      if (channelRef.current && !channelRef.current.contains(event.target as Node)) {
        setIsChannelOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pega os 8 pads do preset atual
  const visiblePads = activePreset === 1 ? ALL_PADS.slice(0, 8) : ALL_PADS.slice(8, 16);

  const pressPad = (note: number, pointerId: number) => {
    if (!isActive) {
      onDisabledPress();
      return;
    }
    const previousNote = activePointersRef.current.get(pointerId);
    if (previousNote !== undefined && previousNote !== note) releasePad(previousNote, pointerId);
    if (!activeNotesRef.current.has(note)) {
      activeNotesRef.current.add(note);
      setPressedPads((current) => {
        const next = new Set(current);
        next.add(note);
        return next;
      });
      if (onActivity) onActivity(100);
      void onNoteOn(note);
    }
    activePointersRef.current.set(pointerId, note);
  };

  const releasePad = (note: number, pointerId: number) => {
    activePointersRef.current.delete(pointerId);
    let isStillPressed = false;
    activePointersRef.current.forEach((heldNote) => {
      if (heldNote === note) isStillPressed = true;
    });
    if (!isStillPressed && activeNotesRef.current.has(note)) {
      activeNotesRef.current.delete(note);
      setPressedPads((current) => {
        const next = new Set(current);
        next.delete(note);
        return next;
      });
      void onNoteOffRef.current(note);
    }
  };

  const releaseAllNotes = () => {
    const notes = Array.from(activeNotesRef.current);
    activeNotesRef.current.clear();
    activePointersRef.current.clear();
    setPressedPads(new Set());
    for (const note of notes) void onNoteOffRef.current(note);
  };

  useEffect(() => {
    const handleGlobalPointerUp = (e: PointerEvent) => {
      const note = activePointersRef.current.get(e.pointerId);
      if (note !== undefined) releasePad(note, e.pointerId);
    };
    window.addEventListener('blur', releaseAllNotes);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('blur', releaseAllNotes);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      releaseAllNotes();
    };
  }, []);

  return (
    <div className="flex flex-col w-full h-full bg-[#0a0f1c] rounded-xl border border-[#1e293b] overflow-hidden">
      
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-[#0f172a] border-b border-[#1e293b] px-3 py-2 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block mr-1">PADS</span>
          <button
            onClick={() => setActivePreset(1)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activePreset === 1 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Preset 1
          </button>
          <button
            onClick={() => setActivePreset(2)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activePreset === 2 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            Preset 2
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* DROPDOWN CUSTOMIZADO DE VELOCITY */}
          <div ref={velocityRef} className="relative">
            <button
              type="button"
              onClick={() => setIsVelocityOpen(!isVelocityOpen)}
              className="flex h-7 items-center gap-1.5 rounded bg-[#0a0f1c] border border-slate-700 px-2 text-[11px] text-slate-200 outline-none hover:bg-slate-800"
            >
              <span className="text-[10px] font-bold uppercase hidden sm:inline text-slate-400">Velocity</span>
              <span className="font-mono font-bold">{selectedVelocity}</span>
              <ChevronDown size={12} />
            </button>
            {isVelocityOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-24 overflow-y-auto rounded-lg border border-slate-700 bg-[#0f172a] shadow-xl custom-scrollbar">
                {VELOCITIES.map((v) => (
                  <button
                    key={v}
                    onClick={() => { onSelectVelocity(v); setIsVelocityOpen(false); }}
                    className={`w-full text-left px-2 py-1.5 text-xs ${selectedVelocity === v ? 'bg-cyan-900/50 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DROPDOWN CUSTOMIZADO DE CANAL */}
          <div ref={channelRef} className="relative">
            <button
              type="button"
              onClick={() => setIsChannelOpen(!isChannelOpen)}
              className="flex h-7 items-center gap-1.5 rounded bg-[#0a0f1c] border border-slate-700 px-2 text-[11px] text-slate-200 outline-none hover:bg-slate-800"
            >
              <span className="text-[10px] font-bold uppercase hidden sm:inline text-slate-400">Canal</span>
              <span className="font-mono font-bold">{String(selectedChannel).padStart(2, '0')}</span>
              <ChevronDown size={12} />
            </button>
            {isChannelOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 w-24 overflow-y-auto max-h-48 rounded-lg border border-slate-700 bg-[#0f172a] shadow-xl custom-scrollbar">
                {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => { onSelectChannel(ch); setIsChannelOpen(false); }}
                    className={`w-full text-left px-2 py-1.5 text-xs font-mono ${selectedChannel === ch ? 'bg-cyan-900/50 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}
                  >
                    {String(ch).padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0 p-2 flex items-center justify-center overflow-hidden">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 w-full h-full max-w-[1000px] max-h-[500px]">
          {visiblePads.map((pad) => {
            const isPressed = pressedPads.has(pad.id);
            const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
              pressPad(pad.id, e.pointerId);
            };
            const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
              if (activePointersRef.current.has(e.pointerId)) pressPad(pad.id, e.pointerId);
            };
            const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
              releasePad(pad.id, e.pointerId);
            };

            return (
              <div
                key={pad.id}
                role="button"
                onPointerDown={handlePointerDown}
                onPointerEnter={handlePointerEnter}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onLostPointerCapture={() => releasePad(pad.id, -1)}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-75 select-none cursor-pointer overflow-hidden ${
                  isPressed
                    ? `border-white/80 ${pad.color} shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-[0.96] z-10`
                    : `border-[#1e293b] bg-[#0f172a] ${pad.border} hover:bg-[#151e2e] shadow-md`
                } ${!isActive ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                style={{ touchAction: 'none' }}
              >
                <div className={`absolute inset-0 opacity-10 ${pad.color} ${isPressed ? 'opacity-50' : ''} transition-opacity`} />
                <div className="flex flex-col items-center justify-center h-full w-full p-2 z-10">
                  <span className={`text-base sm:text-xl font-extrabold text-center leading-tight drop-shadow-md truncate w-full ${isPressed ? 'text-white' : 'text-slate-100'}`}>
                    {pad.label}
                  </span>
                  <span className={`text-[11px] sm:text-sm font-mono mt-1 font-bold ${isPressed ? 'text-white/80' : 'text-slate-500'}`}>
                    N{pad.id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
