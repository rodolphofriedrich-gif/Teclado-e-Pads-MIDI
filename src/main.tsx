import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Captura o elemento root e garante que ele existe
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Elemento #root não encontrado no index.html");
}

// Renderiza o App
// NOTA: StrictMode foi intencionalmente omitido para evitar
// listeners duplicados no motor MIDI durante o desenvolvimento.
createRoot(rootElement).render(<App />);
