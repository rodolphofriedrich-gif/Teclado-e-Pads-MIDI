import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Music2, LayoutGrid, LogOut, AlertTriangle, Keyboard, Maximize, Minimize, ShieldAlert, Crown, CheckCircle2, Lock } from 'lucide-react';
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
  const [isStageMode, setIsStageMode] = useState(false); 
  
  // SISTEMA PRO
  const [isPro, setIsPro] = useState(() => localStorage.getItem('nexus_is_pro') === 'true');
  const [showPaywall, setShowPaywall] = useState(false);

  const [keyboardChannel, setKeyboardChannel] = useState(1);
  const [keyboardVelocity, setKeyboardVelocity] = useState(() => {
    const s = localStorage.getItem('nexus_keyboard_velocity'); return s ? Number(s) : 64;
  });
  const [padsChannel, setPadsChannel] = useState(10);
  const [padsVelocity, setPadsVelocity] = useState(() => {
    const s = localStorage.getItem('nexus_pads_velocity'); return s ? Number(s) : 100;
  });

  const [destinations, setDestinations] = useState<MidiDestination[]>([]);
  const [connectedDestination, setConnectedDestination] = useState<MidiDestination | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isSustainActive, setIsSustainActive] = useState(false);
  const [isScanningBle, setIsScanningBle] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const kChRef = useRef(keyboardChannel), kVRef = useRef(keyboardVelocity);
  const pChRef = useRef(padsChannel), pVRef = useRef(padsVelocity);
  const tabRef = useRef(activeTab);

  useEffect(() => { kChRef.current = keyboardChannel; }, [keyboardChannel]);
  useEffect(() => { kVRef.current = keyboardVelocity; localStorage.setItem('nexus_keyboard_velocity', String(keyboardVelocity)); }, [keyboardVelocity]);
  useEffect(() => { pChRef.current = padsChannel; }, [padsChannel]);
  useEffect(() => { pVRef.current = padsVelocity; localStorage.setItem('nexus_pads_velocity', String(padsVelocity)); }, [padsVelocity]);
  useEffect(() => { tabRef.current = activeTab; }, [activeTab]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => setToast({ message, type }), []);

  const handleTabChange = (tab: AppTab) => {
    if (tab === 'pads' && activeTab !== 'pads') setPadsChannel(10);
    setActiveTab(tab);
  };

  const refreshDestinations = useCallback(async () => {
    const all = await midiManager.getAvailableDestinations();
    setDestinations(all.filter(d => d.id !== 'virtual-main'));
    const c = midiManager.getConnectedDestination();
    setConnectedDestination(c && c.id !== 'virtual-main' ? c : null);
  }, []);

  useEffect(() => {
    let m = true;
    midiManager.setCallbacks(
      () => { if (m) void refreshDestinations(); },
      (d) => { if (m) { setConnectedDestination(null); showToast(`Desconectado: ${d.displayName}`, 'warn'); } }
    );
    void (async () => { try { await midiManager.initWebMidi(); await refreshDestinations(); } catch { if (m) showToast('Falha ao iniciar MIDI nativo', 'error'); } })();
    return () => { m = false; };
  }, [refreshDestinations, showToast]);

  const connectDestination = async (d: MidiDestination) => {
    try { await midiManager.connect(d); setConnectedDestination(d); showToast(`Conectado: ${d.displayName}`, 'success'); }
    catch (e: any) { showToast(e?.message || 'Erro ao conectar.', 'error'); }
  };
  const disconnectDestination = async () => {
    try { await midiManager.disconnect(); } catch {}
    setConnectedDestination(null); showToast('Desconectado', 'info');
  };
  const handleScanBle = async () => {
    setIsScanningBle(true); showToast('Buscando BLE…', 'info');
    try {
      const f = await midiManager.scanBleDevice(); await refreshDestinations();
      showToast(f.length > 0 ? `${f.length} encontrados` : 'Nenhum encontrado', f.length > 0 ? 'success' : 'warn');
    } catch (e: any) { showToast(e?.message || 'Erro ao buscar BLE', 'error'); }
    finally { setIsScanningBle(false); }
  };

  const handleNoteOn = useCallback(async (note: number) => {
    if (!isActive) return;
    if (!midiManager.getConnectedDestination()) { showToast('Conecte uma saída MIDI.', 'warn'); return; }
    const isKb = tabRef.current === 'keyboard';
    try { await midiManager.sendKeyboardNote(isKb ? kChRef.current : pChRef.current, note, isKb ? kVRef.current : pVRef.current, true, isKb ? 'keyboard' : 'pads'); }
    catch (e) { console.error('NoteOn:', e); showToast('Falha ao enviar nota MIDI.', 'error'); }
  }, [isActive, showToast]);

  const handleNoteOff = useCallback(async (note: number) => {
    const isKb = tabRef.current === 'keyboard';
    try { await midiManager.sendKeyboardNote(isKb ? kChRef.current : pChRef.current, note, 0, false, isKb ? 'keyboard' : 'pads'); }
    catch (e) { console.error('NoteOff:', e); }
  }, []);

  const handleDisabledPress = useCallback(() => {
    showToast(isActive ? 'Conecte uma saída MIDI.' : 'Instrumento desligado.', 'warn');
  }, [isActive, showToast]);

  const toggleSustain = async () => {
    const next = !isSustainActive; setIsSustainActive(next);
    if (midiManager.getConnectedDestination()) {
      const ch = tabRef.current === 'keyboard' ? kChRef.current : pChRef.current;
      try { await midiManager.sendControlChange(ch, 64, next ? 127 : 0); }
      catch (e) { console.error('Sustain:', e); showToast('Falha ao enviar Sustain.', 'error'); }
    }
  };

  // FUNÇÕES PRO
  const handlePanic = async () => {
    if (!isPro) { setShowPaywall(true); return; }
    const ch = tabRef.current === 'keyboard' ? kChRef.current : pChRef.current;
    try {
      await midiManager.sendPanic([ch]);
      setIsSustainActive(false);
      showToast('MIDI Panic enviado!', 'success');
    } catch { showToast('Falha no Panic.', 'error'); }
  };

  const handleStageMode = () => {
    if (!isPro) { setShowPaywall(true); return; }
    setIsStageMode(true);
  };

  // SIMULAÇÃO DE COMPRA (Substituir pelo SDK da Samsung no futuro)
  const handleBuyPro = () => {
    // Aqui entrará a chamada nativa: SamsungIAP.purchase('nexus_pro')
    localStorage.setItem('nexus_is_pro', 'true');
    setIsPro(true);
    setShowPaywall(false);
    showToast('Versão PRO desbloqueada! Obrigado!', 'success');
  };

  const confirmExit = () => {
    const nm = (window as any).Capacitor?.Plugins?.NativeMidi;
    if (nm?.fecharApp) nm.fecharApp().catch(console.error); else window.close();
  };

  const isConnected = Boolean(connectedDestination);

  return (
    <div className="nexus-app fixed inset-0 flex h-[100dvh] w-full flex-col overflow-hidden font-sans antialiased select-none bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      
      {!isStageMode && (
        <header className="nexus-header z-50 flex min-h-[56px] shrink-0 items-center justify-between gap-2 px-3 sm:px-5 border-b border-white/5 bg-[#0a0f1c]">
          <div className="flex min-w-0 items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300"><Music2 size={20} /></div>
            <div className="min-w-0 hidden md:flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-wide text-white">Teclado e Pads</h1>
              {isPro ? <span className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow">PRO</span> : <span className="text-[9px] text-slate-500">Free</span>}
              <span className={`h-2.5 w-2.5 rounded-full ml-1 ${isConnected ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            </div>
          </div>
          
          <div className="flex flex-1 justify-center overflow-x-auto px-2 hide-scrollbar">
            <div className="flex h-10 items-center rounded-xl border border-slate-700/50 bg-[#0f172a] p-1">
              <button type="button" onClick={() => handleTabChange('keyboard')} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition ${activeTab === 'keyboard' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}><Keyboard size={16} /><span className="hidden sm:inline">Teclado</span></button>
              <button type="button" onClick={() => handleTabChange('pads')} className={`flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-bold transition ${activeTab === 'pads' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}><LayoutGrid size={16} /><span className="hidden sm:inline">Pads</span></button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!isPro && (
              <button onClick={() => setShowPaywall(true)} className="flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 px-3 text-xs font-bold text-black shadow-lg animate-pulse">
                <Crown size={16} className="mr-1" /> PRO
              </button>
            )}
            <button onClick={handlePanic} title="Parar todas as notas" className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-900/50 bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors">
              {isPro ? <ShieldAlert size={18} /> : <Lock size={14} className="text-red-500/50" />}
            </button>
            <button onClick={handleStageMode} title="Modo Palco" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors">
              {isPro ? <Maximize size={18} /> : <Lock size={14} className="text-slate-500" />}
            </button>
            <div className="hidden sm:block w-[130px] lg:w-[200px]">
              <DestinationDropdown destinations={destinations} connectedDestination={connectedDestination} onConnect={connectDestination} onDisconnect={disconnectDestination} onScanBle={handleScanBle} onRefresh={() => void refreshDestinations()} isScanningBle={isScanningBle} />
            </div>
            <button onClick={() => setShowExitConfirm(true)} title="Sair" className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-900/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 hover:text-rose-300 transition-colors"><LogOut size={16} /></button>
          </div>
        </header>
      )}

      <main className={`flex min-h-0 flex-1 flex-col overflow-hidden ${isStageMode ? 'p-0' : 'p-2 sm:p-3 pb-2'}`}>
        {isStageMode && (
          <button onClick={() => setIsStageMode(false)} className="absolute top-4 right-4 z-[9999] p-3 bg-black/60 hover:bg-black/90 rounded-full text-white backdrop-blur-md border border-white/20 shadow-xl"><Minimize size={24} /></button>
        )}

        {activeTab === 'keyboard' && (
          <div className="flex min-h-0 flex-1 flex-col z-10 relative">
            <MidiKeyboard isConnected={isConnected} selectedChannel={keyboardChannel} onSelectChannel={setKeyboardChannel} selectedVelocity={keyboardVelocity} onSelectVelocity={setKeyboardVelocity} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} onDisabledPress={handleDisabledPress} customWhiteKeyColor="#f8fafc" customBlackKeyColor="#172033" isActive={isActive} onToggleActive={() => setIsActive((v) => !v)} isSustainActive={isSustainActive} onToggleSustain={() => void toggleSustain()} isStageMode={isStageMode} isPro={isPro} onRequestPro={() => setShowPaywall(true)} />
          </div>
        )}
        
        {activeTab === 'pads' && (
          <div className="flex min-h-0 flex-1 flex-col z-10 relative">
            <MidiPadGrid isActive={isActive} onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} onDisabledPress={handleDisabledPress} selectedChannel={padsChannel} onSelectChannel={setPadsChannel} selectedVelocity={padsVelocity} onSelectVelocity={setPadsVelocity} isStageMode={isStageMode} isPro={isPro} onRequestPro={() => setShowPaywall(true)} />
          </div>
        )}
      </main>

      {/* MODAL DE VENDAS (PAYWALL) */}
      {showPaywall && (
        <div className="fixed inset-0 nexus-modal-backdrop flex items-center justify-center p-4 z-[10000]">
          <div className="nexus-modal w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-600" />
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-900/50">
                <Crown size={32} className="text-black" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">Nexus MIDI PRO</h2>
              <p className="text-sm text-slate-400 mt-1">Desbloqueie todo o potencial do seu instrumento.</p>
            </div>

            <ul className="space-y-3 mb-8">
              {['Pitch Bend e Modulação', 'Editor de Pads (Cores e Notas)', 'Modo Palco (Fullscreen)', 'Botão MIDI Panic de emergência'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-200 font-medium">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> {feature}
                </li>
              ))}
            </ul>

            <button onClick={handleBuyPro} className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-lg rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-transform active:scale-95 flex items-center justify-center gap-2">
              Comprar por R$ 19,90
            </button>

            <button onClick={() => setShowPaywall(false)} className="w-full mt-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition">
              Continuar usando a versão Grátis
            </button>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 nexus-modal-backdrop flex items-center justify-center p-4 z-[9999]">
          <div className="nexus-modal w-full max-w-sm rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="nexus-modal-icon flex h-10 w-10 items-center justify-center rounded-full"><AlertTriangle size={20} /></div>
              <h2 className="text-base font-bold text-white">Fechar Aplicativo</h2>
            </div>
            <p className="text-sm text-slate-300 mb-6">Deseja realmente fechar o aplicativo?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowExitConfirm(false)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700">Cancelar</button>
              <button onClick={confirmExit} className="rounded-xl px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md">Sim, Sair</button>
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
