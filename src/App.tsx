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
    <div className="nexus-app fixed inset-0 flex h-screen w-full flex-col overflow-hidden font-sans antialiased select-none bg-[#0a0f1c]">
      
      {/* TOP BAR - Controles Integrados */}
      <header className="nexus-header z-30 flex min-h-[60px] shrink-0 items-center justify-between gap-2 px-3 py-2 bg-slate-900 border-b border-slate-800">
        
        {/* Logo e Título */}
        <div className="flex min-w-0 items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
            <Music2 size={20} />
          </div>
          <div className="min-w-0 hidden md:block">
            <h1 className="text-sm font-extrabold tracking-wide text-white">Teclado e Pads</h1>
          </div>
        </div>

        {/* Controles (Saída, Modo, Vel, CH) - Ocupam o centro e rolam se faltar espaço */}
        <div className="flex flex-1 items-center justify-center gap-2 overflow-x-auto no-scrollbar px-2">
          
          <div className="min-w-[140px] shrink-0">
            <DestinationDropdown
              destinations={destinations}
              connectedDestination={connectedDestination}
              onConnect={connectDestination}
              onDisconnect={disconnectDestination}
              onScanBle={handleScanBle}
              onRefresh={() => void refreshDestinations()}
              isScanningBle={isScanningBle}
            />
          </div>

          <div className="flex h-9 shrink-0 items-center rounded-lg border border-slate-700/50 bg-slate-950 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('keyboard')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition ${
                activeTab === 'keyboard' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music2 size={14} />
              <span className="hidden sm:inline">Teclado</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pads')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition ${
                activeTab === 'pads' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Pads</span>
            </button>
          </div>

          <select
            value={selectedVelocity}
            onChange={(e) => setSelectedVelocity(Number(e.target.value))}
            className="h-9 shrink-0 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
            title="Velocity"
          >
            {VELOCITIES.map((v) => (
              <option key={v} value={v}>
                Vel: {v}
              </option>
            ))}
          </select>

          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(Number(e.target.value))}
            className="h-9 shrink-0 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
            title="Canal MIDI"
          >
            {Array.from({ length: 16 }, (_, i) => i + 1).map((ch) => (
              <option key={ch} value={ch}>CH {String(ch).padStart(2, '0')}</option>
            ))}
          </select>
        </div>

        {/* Status e PWA */}
        <div className="flex shrink-0 items-center gap-2">
          <PWAInstallButton />
          <div className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.6)]' : 'bg-amber-400'}`} />
            <span className="hidden sm:inline max-w-[100px] truncate text-[10px] font-semibold text-slate-300">
              {isConnected ? connectedDestination?.displayName : 'Sem saída'}
            </span>
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL (Teclado ou Pads) - Totalmente expandida */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-4">
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

        {/* Rodapé Minimalista */}
        <div className="mt-2 flex shrink-0 items-center justify-between gap-2 rounded-lg border border-white/5 bg-slate-950/80 px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="truncate text-[10px] text-slate-400">
              {isConnected ? `Conectado: ${connectedDestination?.displayName}` : 'Sem conexão MIDI'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
            <Volume2 size={12} /> {activeNotes} ativa(s)
          </div>
        </div>
      </main>

      {/* TOAST DE AVISO */}
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