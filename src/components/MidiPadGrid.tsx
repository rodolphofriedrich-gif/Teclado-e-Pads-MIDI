import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Settings, X, Check } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface MidiPadGridProps {
  isActive: boolean;
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  onDisabledPress: () => void;
  selectedChannel: number;
  onSelectChannel: (channel: number) => void;
  selectedVelocity: number;
  onSelectVelocity: (velocity: number) => void;
  isStageMode: boolean;
}

interface PadConfig {
  id: number;
  label: string;
  color: string;
  border: string;
}

const DEFAULT_PADS: PadConfig[] = [
  { id: 36, label: 'Bumbo', color: 'bg-blue-600', border: 'border-blue-500' },
  { id: 38, label: 'Caixa', color: 'bg-red-600', border: 'border-red-500' },
  { id: 42, label: 'Chimbal Fech.', color: 'bg-yellow-600', border: 'border-yellow-500' },
  { id: 46, label: 'Chimbal Aber.', color: 'bg-amber-500', border: 'border-amber-400' },
  { id: 41, label: 'Tom Grave', color: 'bg-emerald-600', border: 'border-emerald-500' },
  { id: 45, label: 'Tom Médio', color: 'bg-emerald-500', border: 'border-emerald-400' },
  { id: 48, label: 'Tom Agudo', color: 'bg-teal-600', border: 'border-teal-500' },
  { id: 50, label: 'Tom Alto', color: 'bg-teal-500', border: 'border-teal-400' },
  { id: 49, label: 'Prato Crash', color: 'bg-cyan-600', border: 'border-cyan-500' },
  { id: 51, label: 'Prato Ride', color: 'bg-sky-600', border: 'border-sky-500' },
  { id: 39, label: 'Palmas', color: 'bg-orange-600', border: 'border-orange-500' },
  { id: 69, label: 'Cabaça', color: 'bg-purple-600', border: 'border-purple-500' },
  { id: 54, label: 'Pandeiro', color: 'bg-pink-600', border: 'border-pink-500' },
  { id: 60, label: 'Bongo Agudo', color: 'bg-violet-600', border: 'border-violet-500' },
  { id: 61, label: 'Bongo Grave', color: 'bg-indigo-600', border: 'border-indigo-500' },
  { id: 76, label: 'Madeira', color: 'bg-stone-600', border: 'border-stone-500' },
];

const COLOR_OPTIONS = [
  { color: 'bg-blue-600', border: 'border-blue-500' }, { color: 'bg-red-600', border: 'border-red-500' },
  { color: 'bg-yellow-600', border: 'border-yellow-500' }, { color: 'bg-emerald-600', border: 'border-emerald-500' },
  { color: 'bg-teal-600', border: 'border-teal-500' }, { color: 'bg-cyan-600', border: 'border-cyan-500' },
  { color: 'bg-purple-600', border: 'border-purple-500' }, { color: 'bg-pink-600', border: 'border-pink-500' },
  { color: 'bg-slate-600', border: 'border-slate-500' },
];

const VELOCITIES = [30, 64, 100, 127];
type OpenDropdown = 'velocity' | 'channel' | null;

export function MidiPadGrid({ isActive, onNoteOn, onNoteOff, onDisabledPress, selectedChannel, onSelectChannel, selectedVelocity, onSelectVelocity, isStageMode }: MidiPadGridProps) {
  const [activePreset, setActivePreset] = useState<1 | 2>(1);
  const [pressedPads, setPressedPads] = useState<Set<number>>(() => new Set());
  
  const [pads, setPads] = useState<PadConfig[]>(() => {
    const saved = localStorage.getItem('nexus_custom_pads');
    return saved ? JSON.parse(saved) : DEFAULT_PADS;
  });
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPadIndex, setEditingPadIndex] = useState<number | null>(null);

  const activePointersRef = useRef<Map<number, number>>(new Map());
  const activeNotesRef = useRef<Set<number>>(new Set());
  const [activeDropdown, setActiveDropdown] = useState<OpenDropdown>(null);
  
  const velocityRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);
  const onNoteOffRef = useRef(onNoteOff);

  useEffect(() => { onNoteOffRef.current = onNoteOff; }, [onNoteOff]);
  useEffect(() => { localStorage.setItem('nexus_custom_pads', JSON.stringify(pads)); }, [pads]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!velocityRef.current?.contains(target) && !channelRef.current?.contains(target)) setActiveDropdown(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const visiblePads = activePreset === 1 ? pads.slice(0, 8) : pads.slice(8, 16);

  const pressPad = (note: number, pointerId: number) => {
    if (isEditMode) return;
    if (!isActive) { onDisabledPress(); return; }
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    
    const previousNote = activePointersRef.current.get(pointerId);
    if (previousNote !== undefined && previousNote !== note) releasePad(previousNote, pointerId);
    if (!activeNotesRef.current.has(note)) {
      activeNotesRef.current.add(note);
      setPressedPads((current) => { const next = new Set(current); next.add(note); return next; });
      void onNoteOn(note);
    }
    activePointersRef.current.set(pointerId, note);
  };

  const releasePad = (note: number, pointerId: number) => {
    activePointersRef.current.delete(pointerId);
    let isStillPressed = false;
    activePointersRef.current.forEach((heldNote) => { if (heldNote === note) isStillPressed = true; });
    if (!isStillPressed && activeNotesRef.current.has(note)) {
      activeNotesRef.current.delete(note);
      setPressedPads((current) => { const next = new Set(current); next.delete(note); return next; });
      void onNoteOffRef.current(note);
    }
  };

  const releaseAllNotes = () => {
    const notes = Array.from(activeNotesRef.current);
    activeNotesRef.current.clear(); activePointersRef.current.clear(); setPressedPads(new Set());
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
    return () => { window.removeEventListener('blur', releaseAllNotes); window.removeEventListener('pointerup', handleGlobalPointerUp); window.removeEventListener('pointercancel', handleGlobalPointerUp); releaseAllNotes(); };
  }, []);

  return (
    <div className={`flex flex-col w-full h-full overflow-hidden ${isStageMode ? 'rounded-none border-0 bg-black' : 'bg-[#0a0f1c] rounded-xl border border-[#1e293b]'}`}>
      
      {!isStageMode && (
        <div className="relative z-[100] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 bg-[#0f172a] border-b border-[#1e293b] px-3 py-2 shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button onClick={() => setIsEditMode(!isEditMode)} className={`p-1.5 rounded-lg border transition ${isEditMode ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`} title="Editar Pads">
              <Settings size={16} />
            </button>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block mr-1 ml-1">PADS</span>
            <button onClick={() => setActivePreset(1)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activePreset === 1 ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>Preset 1</button>
            <button onClick={() => setActivePreset(2)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activePreset === 2 ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800'}`}>Preset 2</button>
          </div>

          <div className="flex items-center gap-2">
            <div ref={velocityRef} className="relative">
              <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'velocity' ? null : 'velocity')} className="flex h-9 items-center gap-2 rounded-lg border border-slate-700 bg-[#0f172a] px-3 transition hover:bg-slate-800 text-slate-400"><span className="text-[10px] font-bold uppercase hidden sm:inline">Velocity</span><span className="font-mono text-xs font-bold text-slate-200">{selectedVelocity}</span><ChevronDown size={12} /></button>
              {activeDropdown === 'velocity' && (
                <div className="absolute right-0 top-full z-[999] mt-2 w-32 overflow-y-auto rounded-xl border border-slate-700 bg-[#0f172a] shadow-2xl custom-scrollbar">
                  <div className="flex flex-col gap-0.5 p-1">
                    {VELOCITIES.map((v) => (<button key={v} type="button" onClick={() => { onSelectVelocity(v); setActiveDropdown(null); }} className={`justify-center py-2 text-[11px] rounded transition-colors ${selectedVelocity === v ? 'bg-cyan-900/50 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}>{v} {v === 30 ? 'Suave' : v === 64 ? 'Méd' : v === 100 ? 'Forte' : 'Máx'}</button>))}
                  </div>
                </div>
              )}
            </div>
            <div ref={channelRef} className="relative">
              <button type="button" onClick={() => setActiveDropdown(activeDropdown === 'channel' ? null : 'channel')} className="flex h-9 items-center gap-1.5 rounded-lg border border-[#1e293b] bg-[#0f172a] px-2.5 transition hover:bg-slate-800 text-slate-400"><span className="text-[10px] font-bold uppercase hidden sm:inline">Canal</span><span className="min-w-[16px] text-center font-mono text-xs font-bold text-cyan-300">{String(selectedChannel).padStart(2, '0')}</span><ChevronDown size={12} /></button>
              {activeDropdown === 'channel' && (
                <div className="absolute right-0 top-full z-[999] mt-2 max-h-48 w-24 overflow-y-auto rounded-xl border border-slate-700 bg-[#0f172a] shadow-2xl custom-scrollbar">
                  <div className="nexus-dropdown-list flex flex-col gap-0.5 p-1">
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (<button key={ch} type="button" onClick={() => { onSelectChannel(ch); setActiveDropdown(null); }} className={`justify-center py-2 font-mono text-xs rounded transition-colors ${selectedChannel === ch ? 'bg-cyan-900/50 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'}`}>{String(ch).padStart(2, '0')}</button>))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 w-full min-h-0 p-2 flex items-center justify-center overflow-hidden relative z-0">
        <div className="grid grid-cols-4 grid-rows-2 gap-2 w-full h-full max-w-[1000px] max-h-[500px]">
          {visiblePads.map((pad: PadConfig, index: number) => {
            const realIndex = activePreset === 1 ? index : index + 8;
            const isPressed = pressedPads.has(pad.id);
            return (
              <div key={realIndex} role="button" aria-label={`Pad ${pad.label}`}
                onPointerDown={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); pressPad(pad.id, e.pointerId); }}
                onPointerEnter={(e) => { if (activePointersRef.current.has(e.pointerId)) pressPad(pad.id, e.pointerId); }}
                onPointerUp={(e) => releasePad(pad.id, e.pointerId)} onPointerCancel={(e) => releasePad(pad.id, e.pointerId)} onLostPointerCapture={() => releasePad(pad.id, -1)}
                onClick={() => { if (isEditMode) setEditingPadIndex(realIndex); }}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 transition-all duration-75 select-none cursor-pointer overflow-hidden ${
                  isPressed ? `border-white ${pad.color} shadow-[0_0_20px_rgba(255,255,255,0.4)] scale-[0.96] z-10` : `bg-[#0f172a] ${pad.border} hover:bg-[#151e2e] shadow-md`
                } ${!isActive && !isEditMode ? 'opacity-50 grayscale cursor-not-allowed' : ''} ${isEditMode ? 'ring-2 ring-amber-500/50' : ''}`} style={{ touchAction: 'none' }}>
                <div className={`absolute inset-0 opacity-20 ${pad.color} ${isPressed ? 'opacity-50' : ''} transition-opacity`} />
                {isEditMode && (
                  <div className="absolute top-1 right-1 bg-amber-500 rounded-full p-1 z-20"><Settings size={12} className="text-white" /></div>
                )}
                <div className="flex flex-col items-center justify-center h-full w-full p-1 z-10">
                  <span className={`text-sm sm:text-lg font-extrabold text-center leading-tight drop-shadow-md break-words w-full ${isPressed ? 'text-white' : 'text-slate-100'}`}>{pad.label}</span>
                  <span className={`text-[10px] font-mono mt-1 font-bold ${isPressed ? 'text-white/80' : 'text-slate-400'}`}>N{pad.id}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CORREÇÃO: createPortal para o modal ficar acima de tudo, inclusive do Header */}
      {editingPadIndex !== null && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-sm">Editar Pad</h3>
              <button onClick={() => setEditingPadIndex(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Nome do Pad</span>
                <input type="text" value={pads[editingPadIndex].label} onChange={(e) => { const newPads = [...pads]; newPads[editingPadIndex].label = e.target.value; setPads(newPads); }} className="bg-[#0a0f1c] border border-slate-700 rounded-lg p-2 text-sm text-white" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Nota MIDI (0-127)</span>
                <input type="number" min="0" max="127" value={pads[editingPadIndex].id} onChange={(e) => { const newPads = [...pads]; newPads[editingPadIndex].id = Number(e.target.value); setPads(newPads); }} className="bg-[#0a0f1c] border border-slate-700 rounded-lg p-2 text-sm text-white font-mono" />
              </label>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Cor</span>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c.color} onClick={() => { const newPads = [...pads]; newPads[editingPadIndex].color = c.color; newPads[editingPadIndex].border = c.border; setPads(newPads); }} className={`w-8 h-8 rounded-full ${c.color} border-2 ${pads[editingPadIndex].color === c.color ? 'border-white' : 'border-transparent'}`} />
                  ))}
                </div>
              </div>
              <button onClick={() => setEditingPadIndex(null)} className="mt-2 w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-sm flex justify-center items-center gap-2"><Check size={16} /> Salvar Alterações</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
