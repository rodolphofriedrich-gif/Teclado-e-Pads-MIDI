import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, LayoutGrid, LogOut, AlertTriangle, Keyboard } from 'lucide-react';
import { MidiDestination } from './types/midi';
import { midiManager } from './services/midiService';
import { MidiKeyboard } from './components/MidiKeyboard';
import { MidiPadGrid } from './components/MidiPadGrid';
import { DestinationDropdown } from './components/DestinationDropdown';

type AppTab = 'keyboard' | 'pads';
type Toast = { message: string; type: 'info' | 'warn' | 'error' | 'success' };

const VELOCITIES = [30, 64, 100, 127];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('keyboard');
  const [keyboardChannel, setKeyboardChannel] = useState(1);
  const [keyboardVelocity, setKeyboardVelocity] = useState(() => {
    const saved = localStorage.getItem('nexus_keyboard_velocity');
    const value = saved ? Number(saved) : 64;
    return VELOCITIES.includes(value) ? value : 64;
  });

  const [padsChannel, setPadsChannel] = useState(10);
  const [padsVelocity, setPadsVelocity] = useState(() => {
    const saved = localStorage.getItem('nexus_pads_velocity');
    const value = saved ? Number(saved) : 100;
    return VELOCITIES.includes(value) ? value : 100;
  });

  const [destinations, setDestinations] = useState<MidiDestination[]>([]);
  const [connectedDestination, setConnectedDestination] = useState<MidiDestination | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isSustainActive, setIsSustainActive] = useState(false);
  const [isScanningBle, setIsScanningBle] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const kChannelRef = useRef(keyboardChannel);
  const kVelocityRef = useRef(keyboardVelocity);
  const pChannelRef = useRef(padsChannel);
  const pVelocityRef = useRef(padsVelocity);
  const activeTabRef = useRef(activeTab);

  useEffect(() => { kChannelRef.current = keyboardChannel; }, [keyboardChannel]);
  useEffect(() => { kVelocityRef.current = keyboardVelocity; localStorage.setItem('nexus_keyboard_velocity', String(keyboardVelocity)); }, [keyboardVelocity]);
  useEffect(() => { pChannelRef.current = padsChannel; }, [padsChannel]);
  useEffect(() => { pVelocityRef.current = padsVelocity; localStorage.setItem('nexus_pads_velocity', String(padsVelocity)); }, [padsVelocity]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => setToast({ message, type }), []);

  const handleTabChange = (tab: AppTab) => {
    if (tab === 'pads' && activeTab !== 'pads') setPadsChannel(10);
    setActiveTab(tab);
  };

  const refreshDestinations = useCallback(async () => {
    const all = await midiManager.getAvailableDestinations();
    setDestinations(all.filter((d) => d.id !== 'virtual-main'));
    const connected = midiManager.getConnectedDestination();
    setConnectedDestination(connected && connected.id !== 'virtual-main' ? connected : null);
  }, []);

  useEffect(() => {
    let mounted = true;
    midiManager.setCallbacks(
      () => { if (mounted) void refreshDestinations(); },
      (destination) => { if (mounted) { setConnectedDestination(null); showToast(`Desconectado: ${destination.displayName}`, 'warn'); } }
    );
    void (async () => {
      try { await midiManager.initWebMidi(); await refreshDestinations(); }
      catch { if (mounted) showToast('Falha ao iniciar MIDI nativo', 'error'); }
    })();
    return () => { mounted = false; };
  }, [refreshDestinations, showToast]);

  const connectDestination = async (destination: MidiDestination) => {
    try { await midiManager.connect(destination); setConnectedDestination(destination); showToast(`Conectado: ${destination.displayName}`, 'success'); }
    catch (e: any) { showToast(e?.message || 'Não foi possível conectar.', 'error'); }
  };

  const disconnectDestination = async () => {
    try { await midiManager.disconnect(); } catch {}
    setConnectedDestination(null);
    showToast('Desconectado', 'info');
  };

  const handleScanBle = async () => {
    setIsScanningBle(true); showToast('Buscando BLE…', 'info');
    try {
      const found = await midiManager.scanBleDevice();
      await refreshDestinations();
      showToast(found.length > 0 ? `${found.length} encontrados` : 'Nenhum encontrado', found.length > 0 ? 'success' : 'warn');
    } catch (e: any) { showToast(e?.message || 'Falha na busca BLE.', 'error'); }
    finally { setIsScanningBle(false); }
  };

  const handleNoteOn = useCallback(async (note: number) => {
    if (!isActive) return;
    if (!midiManager.getConnectedDestination()) { showToast('Conecte uma saída MIDI.', 'warn'); return; }
    const ch = activeTabRef.current === 'keyboard' ? kChannelRef.current : pChannelRef.current;
    const vel = activeTabRef.current === 'keyboard' ? kVelocityRef.current : pVelocityRef.current;
    try { await midiManager.sendKeyboardNote(ch, note, vel, true); } catch {}
  }, [isActive, showToast]);

  const handleNoteOff = useCallback(async (note: number) => {
    const ch = activeTabRef.current === 'keyboard' ? kChannelRef.current : pChannelRef.current;
    try { await midiManager.sendKeyboardNote(ch, note, 0, false); } catch {}
  }, []);

  const handleDisabledPress = useCallback(() => {
    showToast(isActive ? 'Conecte uma saída MIDI.' : 'Instrumento desligado.', 'warn');
  }, [isActive, showToast]);

  const toggleSustain = async () => {
    const next = !isSustainActive; setIsSustainActive(next);
    if (midiManager.getConnectedDestination()) {
      const ch = activeTabRef.current === 'keyboard' ? kChannelRef.current : pChannelRef.current;
      try { await midiManager.sendControlChange(ch, 64, next ? 127 : 0); } catch {}
    }
  };

  const confirmExit = () => {
    const nativeMidi = (window as any).Capacitor?.Plugins?.NativeMidi;
    if (nativeMidi?.fecharApp) nativeMidi.fecharApp().catch(console.error);
    else window.close();
  };

  const isConnected = Boolean(connectedDestination);

  return (
    <div className="nexus-app fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden font-sans antialiased select-none bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      
      <header className="nexus-header z-50 flex min-h-[56px] shrink-0 items-center justify-between gap-2 px-3 sm:px-5 border-b border-white/5 bg-[#0a0f1c]">
        <div className="flex min-w-0 items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300"><Music2 size={20} /></div>
          <div className="min-w-0 hidden md:flex items-center gap-2">
            <h1 className="text-sm font-extrabold tracking-wide text-white">Teclado e Pads</h1>
            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,.6)]'}`} title={isConnected ? "Conectado" : "Desconectado"} />
          </div>
        </div>

        <div className="flex flex-1 justify-center overflow-x-auto px-2 hide-scrollbar">
          <div className="flex h-10 items-center rounded-xl border border-slate-700/50 bg-[#0f172a] p-1">
            <button type="button" onClick={() => handleTabChange('keyboard')} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition ${activeTab === 'keyboard' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>
              <Keyboard size={16} /><span className="hidden sm:inline">Teclado</span>
            </button>
            <button type="button" onClick={() => handleTabChange('pads')} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition ${activeTab === 'pads' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>
              <LayoutGrid size={16} /><span className="hidden sm:inline">Pads</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block w-[200px] lg:w-[280px]">
            <DestinationDropdown destinations={destinations} connectedDestination={connectedDestination} onConnect={connectDestination} onDisconnect={disconnectDestination} onScanBle={handleScanBle} onRefresh={() => void refreshDestinations()} isScanningBle={isScanningBle} />
          </div>
          <button onClick={() => setShowExitConfirm(true)} title="Sair" className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-900/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 hover:text-rose-300 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3 pb-0">
        {activeTab === 'keyboard' && (
          <div className="flex min-h-0 flex-1 flex-col z-10 relative pb-2">
            <MidiKeyboard isConnected={isConnected} selectedChannel={keyboardChannel} onSelectChannel={setKeyboardChannel} selectedVelocity={keyboardVelocity} onSelectVelocity={setKeyboardVelocity} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} onDisabledPress={handleDisabledPress} customWhiteKeyColor="#f8fafc" customBlackKeyColor="#172033" onActiveNotesChange={() => {}} onActivity={() => {}} isActive={isActive} onToggleActive={() => setIsActive((v) => !v)} isSustainActive={isSustainActive} onToggleSustain={() => void toggleSustain()} />
          </div>
        )}
        
        {activeTab === 'pads' && (
          <div className="flex min-h-0 flex-1 flex-col z-10 relative pb-2">
            <MidiPadGrid isActive={isActive} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} onDisabledPress={handleDisabledPress} selectedChannel={padsChannel} onSelectChannel={setPadsChannel} selectedVelocity={padsVelocity} onSelectVelocity={setPadsVelocity} />
          </div>
        )}
      </main>

      {showExitConfirm && (
        <div className="fixed inset-0 nexus-modal-backdrop flex items-center justify-center p-4 z-[9999]">
          <div className="nexus-modal w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="nexus-modal-icon flex h-10 w-10 items-center justify-center rounded-full"><AlertTriangle size={20} /></div>
              <h2 className="text-base font-bold text-white">Fechar Aplicativo</h2>
            </div>
            <p className="text-sm text-slate-300 mb-6">Deseja realmente fechar o aplicativo? Certifique-se de ter salvo suas configurações.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors">Cancelar</button>
              <button onClick={confirmExit} className="rounded-xl px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-900/50 transition-colors">Sim, Sair</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <button type="button" onClick={() => setToast(null)} className={`absolute left-3 right-3 top-16 z-[999] rounded-xl border px-4 py-3 text-left text-xs shadow-2xl ${toast.type === 'error' ? 'border-rose-800/60 bg-rose-950/95 text-rose-200' : toast.type === 'warn' ? 'border-amber-800/60 bg-amber-950/95 text-amber-200' : toast.type === 'success' ? 'border-emerald-800/60 bg-emerald-950/95 text-emerald-200' : 'border-slate-700 bg-slate-900/95 text-slate-200'}`}>
          {toast.message} <span className="ml-2 opacity-70">×</span>
        </button>
      )}
    </div>
  );
}
