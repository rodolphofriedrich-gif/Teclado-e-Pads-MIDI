import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, LayoutGrid, Volume2 } from 'lucide-react';
import { MidiDestination } from './types/midi';
import { midiManager } from './services/midiService';
import { MidiKeyboard } from './components/MidiKeyboard';
import { MidiPadGrid } from './components/MidiPadGrid';
import { DestinationDropdown } from './components/DestinationDropdown';
import { PWAInstallButton } from './components/PWAInstallButton';

type AppTab = 'keyboard' | 'pads';
type Toast = { message: string; type: 'info' | 'warn' | 'error' | 'success' };

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
  const [isScanningBle, setIsScanningBle] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const channelRef = useRef(selectedChannel);
  const velocityRef = useRef(selectedVelocity);

  useEffect(() => { channelRef.current = selectedChannel; }, [selectedChannel]);
  useEffect(() => {
    velocityRef.current = selectedVelocity;
    localStorage.setItem('midi_velocity', String(selectedVelocity));
  }, [selectedVelocity]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    setToast({ message, type });
  }, []);

  const refreshDestinations = useCallback(async () => {
    const all = await midiManager.getAvailableDestinations();
    const available = all.filter((d) => d.id !== 'virtual-main');
    setDestinations(available);
    const connected = midiManager.getConnectedDestination();
    setConnectedDestination(connected && connected.id !== 'virtual-main' ? connected : null);
  }, []);

  useEffect(() => {
    let mounted = true;
    midiManager.setCallbacks(
      () => { if (mounted) void refreshDestinations(); },
      (destination) => {
        if (mounted) {
          setConnectedDestination(null);
          showToast(`Desconectado: ${destination.displayName}`, 'warn');
        }
      }
    );
    void (async () => {
      try {
        await midiManager.initWebMidi();
        await refreshDestinations();
        if (mounted) showToast('MIDI pronto', 'success');
      } catch {
        if (mounted) showToast('Não foi possível inicializar o MIDI nativo', 'error');
      }
    })();
    return () => { mounted = false; };
  }, [refreshDestinations, showToast]);

  const connectDestination = async (destination: MidiDestination) => {
    try {
      await midiManager.connect(destination);
      setConnectedDestination(destination);
      showToast(`Conectado: ${destination.displayName}`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Não foi possível conectar ao dispositivo MIDI.', 'error');
    }
  };

  const disconnectDestination = async () => {
    try { await midiManager.disconnect(); } catch {}
    setConnectedDestination(null);
    showToast('Desconectado', 'info');
  };

  const handleScanBle = async () => {
    setIsScanningBle(true);
    showToast('Buscando dispositivos BLE…', 'info');
    try {
      const found = await midiManager.scanBleDevice();
      await refreshDestinations();
      showToast(
        found.length > 0 ? `${found.length} dispositivo(s) BLE encontrado(s)` : 'Nenhum dispositivo BLE encontrado',
        found.length > 0 ? 'success' : 'warn'
      );
    } catch (e: any) {
      showToast(e?.message || 'Falha ao buscar dispositivos BLE.', 'error');
    } finally {
      setIsScanningBle(false);
    }
  };

  const handleNoteOn = useCallback(async (note: number) => {
    if (!isActive) return;
    if (!midiManager.getConnectedDestination()) {
      showToast('Selecione uma saída MIDI antes de tocar.', 'warn');
      return;
    }
    try { await midiManager.sendKeyboardNote(channelRef.current, note, velocityRef.current, true); }
    catch { showToast('Não foi possível enviar a nota MIDI.', 'error'); }
  }, [isActive, showToast]);

  const handleNoteOff = useCallback(async (note: number) => {
    try { await midiManager.sendKeyboardNote(channelRef.current, note, 0, false); } catch {}
  }, []);

  const handleDisabledPress = useCallback(() => {
    showToast(isActive ? 'Conecte uma saída MIDI antes de tocar.' : 'O instrumento está desligado.', 'warn');
  }, [isActive, showToast]);

  const toggleSustain = async () => {
    const next = !isSustainActive;
    setIsSustainActive(next);
    if (midiManager.getConnectedDestination()) {
      try { await midiManager.sendControlChange(channelRef.current, 64, next ? 127 : 0); }
      catch { showToast('Não foi possível enviar o Sustain.', 'error'); }
    }
  };

  const isConnected = Boolean(connectedDestination);

  return (
    <div className="nexus-app fixed inset-0 flex h-screen w-full flex-col overflow-hidden font-sans antialiased select-none">
      <header className="nexus-header z-30 flex min-h-16 shrink-0 items-center justify-between gap-3 px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
            <Music2 size={23} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold tracking-wide text-white sm:text-base">Nexus MIDI</h1>
            <p className="text-[10px] text-slate-400">Controlador virtual</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PWAInstallButton />
          <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.6)]' : 'bg-amber-400'}`} />
            <span className="hidden max-w-[160px] truncate text-[10px] font-semibold text-slate-300 sm:inline">
              {isConnected ? connectedDestination?.displayName : 'Sem saída'}
            </span>
          </div>
        </div>
      </header>

      {/* PAINEL SUPERIOR INTEGRADO */}
      <section className="mx-3 mb-2 grid shrink-0 grid-cols-1 md:grid-cols-[1fr_auto_auto] items-end gap-2 rounded-xl border border-white/10 bg-slate-900/80 p-2 sm:mx-5 sm:gap-3">
        <label className="flex min-w-0 flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Saída MIDI</span>
          <DestinationDropdown
            destinations={destinations}
            connectedDestination={connectedDestination}
            onConnect={connectDestination}
            onDisconnect={disconnectDestination}
            onScanBle={handleScanBle}
            onRefresh={() => void refreshDestinations()}
            isScanningBle={isScanningBle}
          />
        </label>

        {/* BOTÕES TECLADO E PADS NO MEIO */}
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden md:block text-center">Modo</span>
          <div className="flex h-9 items-center rounded-lg border border-slate-700 bg-slate-950 p-0.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('keyboard')}
              className={`flex flex-1 md:flex-none items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold transition ${
                activeTab === 'keyboard' ? 'bg-cyan-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music2 size={14} />
              <span>Teclado</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pads')}
              className={`flex flex-1 md:flex-none items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold transition ${
                activeTab === 'pads' ? 'bg-cyan-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Pads</span>
            </button>
          </div>
        </div>

        {/* VELOCIDADE E CANAL */}
        <div className="flex gap-2 w-full md:w-auto">
          <label className="flex flex-1 md:flex-none flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Vel.</span>
            <select
              value={selectedVelocity}
              onChange={(e) => setSelectedVelocity(Number(e.target.value))}
              className="h-9 w-full md:w-[100px] rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
            >
              {VELOCITIES.map((v) => (
                <option key={v} value={v}>
                  {v} {v === 30 ? 'Suave' : v === 64 ? 'Média' : v === 100 ? 'Forte' : 'Máx'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 md:flex-none flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">CH</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(Number(e.target.value))}
              className="h-9 w-full md:w-[70px] rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
            >
              {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
                <option key={ch} value={ch}>{String(ch).padStart(2, '0')}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 sm:px-4">
        {activeTab === 'keyboard' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <MidiKeyboard
              isConnected={isConnected}
              selectedChannel={selectedChannel}
              onSelectChannel={setSelectedChannel}
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
              onDisabledPress={handleDisabledPress}
              customWhiteKeyColor="#f8fafc"
              customBlackKeyColor="#172033"
              onActiveNotesChange={setActiveNotes}
              onActivity={() => {}}
              isActive={isActive}
              onToggleActive={() => setIsActive((v) => !v)}
              isSustainActive={isSustainActive}
              onToggleSustain={() => void toggleSustain()}
            />
          </div>
        )}
        {activeTab === 'pads' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <MidiPadGrid
              isActive={isActive}
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
              onDisabledPress={handleDisabledPress}
            />
          </div>
        )}

        <div className="mt-2 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="truncate text-[11px] text-slate-300">
              {isConnected ? `Conectado: ${connectedDestination?.displayName}` : 'Sem conexão MIDI'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
            <Volume2 size={13} /> {activeNotes} ativa(s)
          </div>
        </div>
      </main>

      {toast && (
        <button
          type="button"
          onClick={() => setToast(null)}
          className={`absolute left-3 right-3 top-16 z-50 rounded-xl border px-4 py-3 text-left text-xs shadow-2xl ${
            toast.type === 'error' ? 'border-rose-800/60 bg-rose-950/95 text-rose-200'
              : toast.type === 'warn' ? 'border-amber-800/60 bg-amber-950/95 text-amber-200'
              : toast.type === 'success' ? 'border-emerald-800/60 bg-emerald-950/95 text-emerald-200'
              : 'border-slate-700 bg-slate-900/95 text-slate-200'
          }`}
        >
          {toast.message} <span className="ml-2 opacity-70">×</span>
        </button>
      )}
    </div>
  );
}
