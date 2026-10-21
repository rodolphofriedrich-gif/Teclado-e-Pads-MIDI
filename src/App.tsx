import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, CheckCircle2, Music2, LayoutGrid, Plug, Unplug, Volume2 } from 'lucide-react';
import { MidiDestination } from './types/midi';
import { midiManager } from './services/midiService';
import { MidiKeyboard } from './components/MidiKeyboard';
import { MidiPadGrid } from './components/MidiPadGrid';

 type AppTab = 'keyboard' | 'pads';
 const VELOCITIES = [30, 64, 100, 127];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('keyboard');
  const [selectedChannel, setSelectedChannel] = useState(1);
  const [selectedVelocity, setSelectedVelocity] = useState(() => {
    const saved = localStorage.getItem('midi_velocity');
    const value = saved ? Number(saved) : 64;
    return VELOCITIES.includes(value) ? value : 64;
  });
  const [destinations, setDestinations] = useState<MidiDestination[]>([]);
  const [connectedDestination, setConnectedDestination] = useState<MidiDestination | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isSustainActive, setIsSustainActive] = useState(false);
  const [activeNotes, setActiveNotes] = useState(0);
  const [status, setStatus] = useState('Procurando dispositivos MIDI…');
  const [error, setError] = useState('');
  const channelRef = useRef(selectedChannel);
  const velocityRef = useRef(selectedVelocity);
  useEffect(() => { channelRef.current = selectedChannel; }, [selectedChannel]);
  useEffect(() => { velocityRef.current = selectedVelocity; localStorage.setItem('midi_velocity', String(selectedVelocity)); }, [selectedVelocity]);

  const refreshDestinations = useCallback(async () => {
    const all = await midiManager.getAvailableDestinations();
    // A saída virtual interna não é um destino físico/de outro aplicativo. A interface
    // não oferece busca BLE; destinos Android MIDI locais/virtuais continuam disponíveis.
    const available = all.filter((d) => d.id !== 'virtual-main' && d.type !== 'ble' && (d.outputPortCount ?? 1) > 0);
    setDestinations(available);
    const connected = midiManager.getConnectedDestination();
    setConnectedDestination(connected && connected.id !== 'virtual-main' ? connected : null);
  }, []);

  useEffect(() => {
    let mounted = true;
    midiManager.setCallbacks(() => { if (mounted) void refreshDestinations(); }, (destination) => {
      if (mounted) {
        setConnectedDestination(null);
        setStatus(`Dispositivo desconectado: ${destination.displayName}`);
      }
    });
    void (async () => {
      try {
        await midiManager.initWebMidi();
        await refreshDestinations();
        if (mounted) setStatus('Pronto para tocar');
      } catch {
        if (mounted) setStatus('Não foi possível inicializar o MIDI nativo');
      }
    })();
    return () => { mounted = false; };
  }, [refreshDestinations]);

  const connectDestination = async (id: string) => {
    setError('');
    if (!id) {
      try { await midiManager.disconnect(); } catch {}
      setConnectedDestination(null);
      setStatus('Desconectado');
      return;
    }
    const destination = destinations.find((d) => d.id === id);
    if (!destination) return;
    try {
      await midiManager.connect(destination);
      setConnectedDestination(destination);
      setStatus(`Conectado: ${destination.displayName}`);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível conectar ao dispositivo MIDI.');
      setStatus('Falha na conexão MIDI');
    }
  };

  const handleNoteOn = useCallback(async (note: number) => {
    if (!isActive) return;
    if (!midiManager.getConnectedDestination()) {
      setError('Selecione uma saída MIDI para enviar as notas.');
      return;
    }
    setError('');
    try { await midiManager.sendKeyboardNote(channelRef.current, note, velocityRef.current, true); }
    catch { setError('Não foi possível enviar a nota MIDI.'); }
  }, [isActive]);

  const handleNoteOff = useCallback(async (note: number) => {
    try { await midiManager.sendKeyboardNote(channelRef.current, note, 0, false); } catch {}
  }, []);

  const handleDisabledPress = useCallback(() => {
    setError(isActive ? 'Conecte uma saída MIDI antes de tocar.' : 'O instrumento está desligado.');
  }, [isActive]);

  const toggleSustain = async () => {
    const next = !isSustainActive;
    setIsSustainActive(next);
    if (midiManager.getConnectedDestination()) {
      try { await midiManager.sendControlChange(channelRef.current, 64, next ? 127 : 0); }
      catch { setError('Não foi possível enviar o comando Sustain.'); }
    }
  };

  const isConnected = Boolean(connectedDestination);

  return (
    <div className="nexus-app fixed inset-0 flex h-screen w-full flex-col overflow-hidden font-sans antialiased select-none">
      <header className="nexus-header z-30 flex min-h-16 shrink-0 items-center justify-between gap-3 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300"><Music2 size={23}/></div>
          <div className="min-w-0"><h1 className="text-sm font-extrabold tracking-wide text-white sm:text-base">Teclado e Pads MIDI</h1><p className="text-[10px] text-slate-400">Instrumento MIDI virtual</p></div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.6)]' : 'bg-amber-400'}`} />
          <span className="hidden text-xs text-slate-300 sm:inline">{isConnected ? 'Conectado' : 'Sem saída'}</span>
        </div>
      </header>

      <section className="mx-3 mb-2 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border border-white/10 bg-slate-900/80 p-2 sm:mx-5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:gap-3">
        <label className="flex min-w-0 flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saída MIDI</span>
          <select value={connectedDestination?.id || ''} onChange={(e) => void connectDestination(e.target.value)} className="h-9 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400">
            <option value="">Selecionar dispositivo…</option>
            {destinations.map((d) => <option key={d.id} value={d.id}>{d.displayName}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Velocity</span>
          <select value={selectedVelocity} onChange={(e) => setSelectedVelocity(Number(e.target.value))} className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400">
            {VELOCITIES.map((v) => <option key={v} value={v}>{v} {v === 30 ? 'Suave' : v === 64 ? 'Média' : v === 100 ? 'Forte' : 'Máxima'}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => void refreshDestinations()} className="col-span-2 flex h-8 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-semibold text-slate-200 hover:bg-slate-700 sm:col-span-1 sm:mt-4" title="Atualizar dispositivos"><Activity size={14}/> Atualizar</button>
      </section>

      <nav className="mx-3 mb-2 grid shrink-0 grid-cols-2 gap-2 sm:mx-5" aria-label="Instrumentos">
        <button type="button" onClick={() => setActiveTab('keyboard')} className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${activeTab === 'keyboard' ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200' : 'border-white/10 bg-slate-900/70 text-slate-400'}`}><Music2 size={17}/> Teclado</button>
        <button type="button" onClick={() => setActiveTab('pads')} className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${activeTab === 'pads' ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200' : 'border-white/10 bg-slate-900/70 text-slate-400'}`}><LayoutGrid size={17}/> Pads</button>
      </nav>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 sm:px-4">
        {activeTab === 'keyboard' ? <div className="flex min-h-0 flex-1 flex-col"><MidiKeyboard isConnected={isConnected} selectedChannel={selectedChannel} onSelectChannel={setSelectedChannel} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} onDisabledPress={handleDisabledPress} customWhiteKeyColor="#f8fafc" customBlackKeyColor="#172033" onActiveNotesChange={setActiveNotes} onActivity={() => {}} isActive={isActive} onToggleActive={() => setIsActive((v) => !v)} isSustainActive={isSustainActive} onToggleSustain={() => void toggleSustain()} /></div> : <div className="flex min-h-0 flex-1 flex-col gap-2"><div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2"><span className="text-xs font-bold text-slate-200">16 pads MIDI</span><label className="flex items-center gap-2 text-xs text-slate-400">Canal <select value={selectedChannel} onChange={(e) => setSelectedChannel(Number(e.target.value))} className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-slate-100">{Array.from({length:16},(_,i)=><option key={i+1} value={i+1}>{String(i+1).padStart(2,'0')}</option>)}</select></label></div><MidiPadGrid isActive={isActive} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} onDisabledPress={handleDisabledPress}/></div>}
        <div className="mt-2 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2"><div className="flex min-w-0 items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}/><span className="truncate text-[11px] text-slate-300">{status}</span></div><div className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500"><Volume2 size={13}/>{activeNotes} ativa(s)</div></div>
        {error && <button type="button" onClick={() => setError('')} className="mt-1 shrink-0 rounded-lg border border-amber-500/20 bg-amber-950/40 px-3 py-2 text-left text-xs text-amber-200">{error} <span className="ml-2 opacity-70">×</span></button>}
      </main>
    </div>
  );
}
