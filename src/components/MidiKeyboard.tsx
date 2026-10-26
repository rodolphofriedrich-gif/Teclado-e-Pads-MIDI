import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Power, Pause, SlidersHorizontal, Maximize, MoveHorizontal, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { midiManager } from '../services/midiService';

interface MidiKeyboardProps {
  isConnected: boolean;
  selectedChannel: number;
  onSelectChannel: (channel: number) => void;
  selectedVelocity: number;
  onSelectVelocity: (velocity: number) => void;
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  onDisabledPress: () => void;
  customWhiteKeyColor: string;
  customBlackKeyColor: string;
  isActive: boolean;
  onToggleActive: () => void;
  isSustainActive: boolean;
  onToggleSustain: () => void;
  isStageMode: boolean;
  isPro: boolean;
  onRequestPro: () => void;
}

const OCTAVE_NOTES = [
  { semitone: 0, name: 'C', type: 'white' }, { semitone: 1, name: 'C#', type: 'black' }, { semitone: 2, name: 'D', type: 'white' },
  { semitone: 3, name: 'D#', type: 'black' }, { semitone: 4, name: 'E', type: 'white' }, { semitone: 5, name: 'F', type: 'white' },
  { semitone: 6, name: 'F#', type: 'black' }, { semitone: 7, name: 'G', type: 'white' }, { semitone: 8, name: 'G#', type: 'black' },
  { semitone: 9, name: 'A', type: 'white' }, { semitone: 10, name: 'A#', type: 'black' }, { semitone: 11, name: 'B', type: 'white' },
] as const;

const TOTAL_WHITE_KEYS = 14, MIN_KEY_WIDTH = 35, MAX_KEY_WIDTH = 95;
const VELOCITIES = [30, 64, 100, 127];
type OpenDropdown = 'velocity' | 'channel' | 'settings' | null;

export function MidiKeyboard({ isConnected, selectedChannel, onSelectChannel, selectedVelocity, onSelectVelocity, onNoteOn, onNoteOff, onDisabledPress, customWhiteKeyColor, customBlackKeyColor, isActive, onToggleActive, isSustainActive, onToggleSustain, isStageMode, isPro, onRequestPro }: MidiKeyboardProps) {
  const [startOctave, setStartOctave] = useState(() => Number(localStorage.getItem('nexus_key_octave')) || 3);
  const [keyWidth, setKeyWidth] = useState(() => Number(localStorage.getItem('nexus_key_width')) || 60);
  const [isScrollLocked, setIsScrollLocked] = useState(() => localStorage.getItem('nexus_key_scroll') === 'true');
  const [minKeyWidth, setMinKeyWidth] = useState(MIN_KEY_WIDTH);
  const [pressedNotes, setPressedNotes] = useState<Set<number>>(() => new Set());
  
  const [pitchBend, setPitchBend] = useState(8192);
  const [modWheel, setModWheel] = useState(0);

  const [activeDropdown, setActiveDropdown] = useState<OpenDropdown>(null);
  const settingsRef = useRef<HTMLDivElement>(null), channelDropdownRef = useRef<HTMLDivElement>(null), velocityDropdownRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null), containerRef = useRef<HTMLDivElement>(null);
  const activeNotesRef = useRef<Set<number>>(new Set()), activePointersRef = useRef<Map<number, number>>(new Map());
  const onNoteOffRef = useRef(onNoteOff), onDisabledPressRef = useRef(onDisabledPress);

  useEffect(() => {
    if (isConnected && isPro) midiManager.sendPitchBend(selectedChannel, pitchBend).catch(() => {});
  }, [pitchBend, selectedChannel, isConnected, isPro]);

  useEffect(() => {
    if (isConnected && isPro) midiManager.sendControlChange(selectedChannel, 1, modWheel).catch(() => {});
  }, [modWheel, selectedChannel, isConnected, isPro]);

  useEffect(() => { localStorage.setItem('nexus_key_octave', String(startOctave)); localStorage.setItem('nexus_key_width', String(keyWidth)); localStorage.setItem('nexus_key_scroll', String(isScrollLocked)); }, [startOctave, keyWidth, isScrollLocked]);
  useEffect(() => { onNoteOffRef.current = onNoteOff; }, [onNoteOff]);
  useEffect(() => { onDisabledPressRef.current = onDisabledPress; }, [onDisabledPress]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!velocityDropdownRef.current?.contains(target) && !channelDropdownRef.current?.contains(target) && !settingsRef.current?.contains(target)) setActiveDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const updateMinSize = () => {
      const container = containerRef.current; if (!container) return;
      const availableWidth = Math.max(0, container.clientWidth - 12);
      const calculatedMin = Math.max(MIN_KEY_WIDTH, Math.floor(availableWidth / TOTAL_WHITE_KEYS));
      setMinKeyWidth(Math.min(MAX_KEY_WIDTH, calculatedMin));
      setKeyWidth((current) => Math.max(Math.min(MAX_KEY_WIDTH, calculatedMin), Math.min(MAX_KEY_WIDTH, current)));
    };
    updateMinSize();
    let observer: ResizeObserver | undefined;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(updateMinSize); observer.observe(containerRef.current); }
    window.addEventListener('resize', updateMinSize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', updateMinSize); };
  }, []);

  const scrollKeyboard = (direction: 'left' | 'right') => { if (scrollViewportRef.current) scrollViewportRef.current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' }); };

  const pressNote = (note: number, pointerId: number) => {
    if (!isActive) return;
    if (!isConnected) { onDisabledPressRef.current(); return; }
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});

    const previousNote = activePointersRef.current.get(pointerId);
    if (previousNote !== undefined && previousNote !== note) releaseNote(previousNote, pointerId);
    if (!activeNotesRef.current.has(note)) {
      activeNotesRef.current.add(note); setPressedNotes((current) => { const next = new Set(current); next.add(note); return next; });
      void onNoteOn(note);
    }
    activePointersRef.current.set(pointerId, note);
  };

  const releaseNote = (note: number, pointerId: number) => {
    activePointersRef.current.delete(pointerId);
    let isStillPressed = false; activePointersRef.current.forEach((heldNote) => { if (heldNote === note) isStillPressed = true; });
    if (!isStillPressed && activeNotesRef.current.has(note)) {
      activeNotesRef.current.delete(note); setPressedNotes((current) => { const next = new Set(current); next.delete(note); return next; });
      void onNoteOffRef.current(note);
    }
  };

  useEffect(() => {
    const releaseAllNotes = () => {
      const notes = Array.from(activeNotesRef.current);
      activeNotesRef.current.clear(); activePointersRef.current.clear(); setPressedNotes(new Set());
      for (const note of notes) void onNoteOffRef.current(note);
    };
    const handleGlobalPointerUp = (e: PointerEvent) => { const note = activePointersRef.current.get(e.pointerId); if (note !== undefined) releaseNote(note, e.pointerId); };
    window.addEventListener('blur', releaseAllNotes); window.addEventListener('pointerup', handleGlobalPointerUp); window.addEventListener('pointercancel', handleGlobalPointerUp);
    return () => { window.removeEventListener('blur', releaseAllNotes); window.removeEventListener('pointerup', handleGlobalPointerUp); window.removeEventListener('pointercancel', handleGlobalPointerUp); releaseAllNotes(); };
  }, []);

  const renderKeys = () => {
    const keys: React.ReactNode[] = []; let whiteIndex = 0;
    for (let octave = startOctave; octave <= startOctave + 1; octave++) {
      for (const noteDef of OCTAVE_NOTES) {
        const midiNote = (octave + 1) * 12 + noteDef.semitone; if (midiNote > 127) continue;
        const isWhite = noteDef.type === 'white', isPressed = pressedNotes.has(midiNote);
        const noteLabel = noteDef.name === 'C' ? `C${octave}` : noteDef.name, keyOpacity = isActive ? 1 : 0.5;

        if (isWhite) {
          whiteIndex++;
          keys.push(
            <div key={midiNote} role="button" aria-label={`Nota ${noteLabel}`} onPointerDown={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); pressNote(midiNote, e.pointerId); }} onPointerEnter={(e) => { if (activePointersRef.current.has(e.pointerId)) pressNote(midiNote, e.pointerId); }} onPointerUp={(e) => releaseNote(midiNote, e.pointerId)} onPointerCancel={(e) => releaseNote(midiNote, e.pointerId)} onLostPointerCapture={() => releaseNote(midiNote, -1)}
              className="relative z-10 flex h-full shrink-0 cursor-pointer flex-col items-center justify-end rounded-b-lg border transition-[filter,transform,box-shadow] duration-75 select-none" style={{ width: `${keyWidth}px`, background: isPressed ? `linear-gradient(180deg, ${customWhiteKeyColor} 0%, #bfdbfe 100%)` : `linear-gradient(180deg, ${customWhiteKeyColor} 0%, ${customWhiteKeyColor} 88%, #cbd5e1 100%)`, borderColor: isPressed ? '#22d3ee' : 'rgba(100,116,139,0.75)', boxShadow: isPressed ? 'inset 0 3px 9px rgba(15,23,42,0.22), 0 0 12px rgba(34,211,238,0.28)' : '0 3px 0 rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.25)', transform: isPressed ? 'translateY(2px)' : 'translateY(0)', touchAction: 'none', opacity: keyOpacity }}>
              <span className="mb-4 rounded px-1 text-[11px] font-bold select-none" style={{ color: isPressed ? '#075985' : '#1e293b', background: isPressed ? 'rgba(255,255,255,0.45)' : 'transparent' }}>{noteLabel}</span>
            </div>
          );
        } else {
          const blackWidth = keyWidth * 0.58, left = (whiteIndex - 1) * keyWidth + keyWidth - blackWidth / 2;
          keys.push(
            <div key={midiNote} role="button" aria-label={`Nota ${noteDef.name}`} onPointerDown={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); pressNote(midiNote, e.pointerId); }} onPointerEnter={(e) => { if (activePointersRef.current.has(e.pointerId)) pressNote(midiNote, e.pointerId); }} onPointerUp={(e) => releaseNote(midiNote, e.pointerId)} onPointerCancel={(e) => releaseNote(midiNote, e.pointerId)} onLostPointerCapture={() => releaseNote(midiNote, -1)}
              className="absolute top-0 z-30 flex h-[62%] cursor-pointer flex-col items-center justify-end rounded-b-sm border select-none" style={{ width: `${blackWidth}px`, left: `${left}px`, background: isPressed ? 'linear-gradient(180deg, #38bdf8 0%, #0369a1 100%)' : `linear-gradient(180deg, ${customBlackKeyColor} 0%, ${customBlackKeyColor} 72%, #020617 100%)`, borderColor: isPressed ? '#67e8f9' : '#020617', boxShadow: isPressed ? '0 0 12px rgba(34,211,238,0.55), inset 0 0 5px rgba(255,255,255,0.25)' : '0 3px 4px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)', transform: isPressed ? 'translateY(2px)' : 'translateY(0)', touchAction: 'none', opacity: keyOpacity }}>
              <span className="mb-4 text-[10px] font-bold select-none" style={{ color: isPressed ? '#ecfeff' : '#cbd5e1' }}>{noteDef.name}</span>
            </div>
          );
        }
      }
    }
    return keys;
  };

  return (
    <section className={`nexus-midi-keyboard flex min-h-0 w-full flex-1 flex-col gap-1 ${isStageMode ? 'rounded-none border-0 p-0' : 'rounded-2xl border p-1 sm:p-1.5'}`} style={{ background: isStageMode ? '#000' : 'linear-gradient(145deg, rgba(17,24,39,0.98), rgba(8,13,25,0.99))', borderColor: 'rgba(148,163,184,0.16)' }}>
      
      {!isStageMode && (
        <div className="nexus-midi-controls relative z-[100] flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border px-2 py-1.5 sm:px-3" style={{ background: 'rgba(5,10,22,0.76)', borderColor: 'rgba(148,163,184,0.14)' }}>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button type="button" onClick={onToggleActive} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-all ${isActive ? 'border-cyan-700/50 bg-cyan-900/30 text-cyan-400' : 'border-slate-700 bg-slate-800/50 text-slate-500'}`}><Power size={15} /><span className="hidden sm:inline">{isActive ? 'LIG' : 'DESL'}</span></button>
            <button type="button" onClick={onToggleSustain} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-all ${isSustainActive ? 'border-amber-500/50 bg-amber-900/30 text-amber-400' : 'border-slate-700 bg-slate-800/50 text-slate-400'}`}><Pause size={15} /><span className="hidden sm:inline">PEDAL</span></button>
            
            <div className="flex items-center gap-1.5">
              <div className="flex items-center overflow-hidden rounded-lg border" style={{ background: '#0f172a', borderColor: 'rgba(148,163,184,0.2)' }}>
                <button type="button" disabled={startOctave <= 1} onClick={() => setStartOctave((v) => Math.max(1, v - 1))} className="flex h-9 w-8 items-center justify-center text-lg font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-35">−</button>
                <span className="min-w-[32px] text-center font-mono text-xs font-bold text-cyan-300">C{startOctave}</span>
                <button type="button" disabled={startOctave >= 6} onClick={() => setStartOctave((v) => Math.min(6, v + 1))} className="flex h-9 w-8 items-center justify-center text-lg font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-35">+</button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2" ref={settingsRef}>
            <div className="relative" ref={velocityDropdownRef}>
              <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'velocity' ? null : 'velocity')} className="flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-[#0f172a] px-3 transition hover:bg-slate-800 text-slate-400"><span className="text-[10px] font-bold uppercase hidden sm:inline">Velocity</span><span className="font-mono text-xs font-bold text-slate-200">{selectedVelocity}</span><ChevronDown size={12} /></button>
              {activeDropdown === 'velocity' && (
                <div className="absolute top-full right-0 z-[999] mt-2 w-32 overflow-y-auto rounded-xl border border-slate-700 bg-[#0f172a] shadow-2xl custom-scrollbar">
                  <div className="flex flex-col gap-0.5 p-1">
                    {VELOCITIES.map((v) => (<button key={v} type="button" onClick={() => { onSelectVelocity(v); setActiveDropdown(null); }} className={`justify-center py-2 text-[11px] rounded transition-colors ${selectedVelocity === v ? 'bg-cyan-900/50 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}>{v} {v === 30 ? 'Suave' : v === 64 ? 'Méd' : v === 100 ? 'Forte' : 'Máx'}</button>))}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={channelDropdownRef}>
              <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'channel' ? null : 'channel')} className="flex h-9 items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#0f172a] px-2.5 transition hover:bg-slate-800 text-slate-400"><span className="text-[10px] font-bold uppercase hidden sm:inline">Canal</span><span className="min-w-[16px] text-center font-mono text-xs font-bold text-cyan-300">{String(selectedChannel).padStart(2, '0')}</span><ChevronDown size={12} /></button>
              {activeDropdown === 'channel' && (
                <div className="absolute top-full right-0 z-[999] mt-2 max-h-48 w-24 overflow-y-auto rounded-xl border border-slate-700 bg-[#0f172a] shadow-2xl custom-scrollbar">
                  <div className="nexus-dropdown-list flex flex-col gap-0.5 p-1">
                    {Array.from({ length: 16 }, (_, i) => (<button key={i + 1} type="button" onClick={() => { onSelectChannel(i + 1); setActiveDropdown(null); }} className={`justify-center py-2 font-mono text-xs rounded transition-colors ${selectedChannel === i + 1 ? 'bg-cyan-900/50 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}>{String(i + 1).padStart(2, '0')}</button>))}
                  </div>
                </div>
              )}
            </div>
            <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'settings' ? null : 'settings')} className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${activeDropdown === 'settings' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-[#0f172a] border-[#1e293b] text-slate-400 hover:text-slate-200'}`}><SlidersHorizontal size={16} /></button>
            {activeDropdown === 'settings' && (
              <div className="absolute top-full right-0 z-[999] mt-2 w-64 rounded-xl border border-slate-700 bg-[#0f172a] p-3 shadow-2xl flex flex-col gap-4">
                <div>
                  <label className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400 mb-2"><span>Zoom do Teclado</span><span className="font-mono text-cyan-300">{keyWidth}px</span></label>
                  <input type="range" min={minKeyWidth} max={MAX_KEY_WIDTH} value={keyWidth} onChange={(e) => setKeyWidth(Number(e.target.value))} className="h-1.5 w-full cursor-pointer accent-cyan-400" />
                </div>
                <div className="h-px w-full bg-slate-800" />
                <button type="button" onClick={() => setIsScrollLocked(!isScrollLocked)} className={`flex items-center justify-between w-full p-2 rounded-lg border transition-colors ${isScrollLocked ? 'bg-amber-900/20 border-amber-700/50 text-amber-400' : 'bg-[#0a0f1c] border-slate-800 text-slate-400'}`}>
                  <span className="text-xs font-bold flex items-center gap-2">{isScrollLocked ? <Maximize size={14} /> : <MoveHorizontal size={14} />} {isScrollLocked ? 'Tela Fixa' : 'Rolagem Livre'}</span>
                  <div className={`w-8 h-4 rounded-full transition-colors relative ${isScrollLocked ? 'bg-amber-500' : 'bg-slate-700'}`}><div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isScrollLocked ? 'left-4' : 'left-0.5'}`} /></div>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={containerRef} className="flex-1 min-h-0 relative z-0 flex flex-col">
        <div className={`relative flex-1 flex overflow-hidden ${isStageMode ? 'rounded-none border-0' : 'rounded-xl border border-[#1e293b]'}`}>
          
          {!isScrollLocked && (
            <>
              <button onClick={() => scrollKeyboard('left')} className="absolute left-1 top-1/2 -translate-y-1/2 z-40 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-sm shadow-xl transition-all active:scale-95 border border-white/10"><ChevronLeft size={24} /></button>
              <button onClick={() => scrollKeyboard('right')} className="absolute right-1 top-1/2 -translate-y-1/2 z-40 p-2 bg-black/60 hover:bg-black/90 text-white rounded-full backdrop-blur-sm shadow-xl transition-all active:scale-95 border border-white/10"><ChevronRight size={24} /></button>
            </>
          )}

          <div ref={scrollViewportRef} className={`nexus-midi-viewport relative flex-1 ${isScrollLocked ? 'overflow-hidden' : 'overflow-x-auto overflow-y-hidden'}`} style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(30,41,59,0.72), rgba(2,6,23,0.98) 78%)', touchAction: isScrollLocked ? 'none' : 'pan-x', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <div className="relative flex h-full items-stretch p-0.5" style={{ width: `${TOTAL_WHITE_KEYS * keyWidth}px`, minWidth: `${TOTAL_WHITE_KEYS * keyWidth}px`, marginInline: isScrollLocked ? 'auto' : undefined }}>{renderKeys()}</div>
          </div>

          {/* CONTROLES DE PERFORMANCE PRO (PITCH BEND E MOD WHEEL) */}
          <div className="flex flex-row items-stretch gap-1 px-1 py-2 bg-[#0a0f1c] border-l border-slate-800 z-20 touch-none relative">
            
            {!isPro && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center cursor-pointer" onClick={onRequestPro}>
                <Lock size={16} className="text-amber-500 mb-1" />
                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">PRO</span>
              </div>
            )}

            <div className="flex flex-col items-center justify-between w-8">
              <span className="text-[8px] font-bold text-slate-500">P.BEND</span>
              <div className="relative flex-1 w-6 bg-[#05080f] rounded-full border border-slate-700 overflow-hidden my-1">
                <div className="absolute w-full bg-gradient-to-t from-cyan-900 to-cyan-500" style={{ bottom: '50%', height: `${((pitchBend - 8192) / 8192) * 50}%` }} />
                <div className="absolute w-full bg-gradient-to-b from-cyan-900 to-cyan-500" style={{ top: '50%', height: `${((8192 - pitchBend) / 8192) * 50}%` }} />
              </div>
              <input type="range" min="0" max="16383" value={pitchBend} onChange={(e) => setPitchBend(Number(e.target.value))} onPointerUp={() => setPitchBend(8192)} onTouchEnd={() => setPitchBend(8192)} onMouseUp={() => setPitchBend(8192)} className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize" style={{ WebkitAppearance: 'slider-vertical', writingMode: 'vertical-lr', direction: 'rtl' }} />
            </div>
            
            <div className="flex flex-col items-center justify-between w-8">
              <span className="text-[8px] font-bold text-slate-500">MOD</span>
              <div className="relative flex-1 w-6 bg-[#05080f] rounded-full border border-slate-700 overflow-hidden my-1">
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-purple-900 to-purple-500" style={{ height: `${(modWheel / 127) * 100}%` }} />
              </div>
              <input type="range" min="0" max="127" value={modWheel} onChange={(e) => setModWheel(Number(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize" style={{ WebkitAppearance: 'slider-vertical', writingMode: 'vertical-lr', direction: 'rtl' }} />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
