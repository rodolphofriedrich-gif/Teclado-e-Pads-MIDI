# 🎹 Teclado e Pads MIDI

Um controlador MIDI virtual profissional para Android, projetado para músicos, produtores e entusiastas que desejam transformar seu celular ou tablet em um instrumento completo.

![Status](https://img.shields.io/badge/status-active-success.svg)
![Versão](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Plataforma](https://img.shields.io/badge/platform-Android-3DDC84?logo=android&logoColor=white)

---

## 📱 Sobre o Aplicativo

O **Teclado e Pads MIDI** é um aplicativo que envia mensagens MIDI (Note On/Off, Control Change, Pitch Bend, etc.) para outros aplicativos (como FluidSynth, Mobileer MIDI Scope) ou dispositivos de hardware (via USB ou Bluetooth BLE). Ele foi construído com foco em **performance e latência baixa**, sendo ideal para uso ao vivo.

### ✨ Funcionalidades Principais

- **Teclado Virtual Profissional:**
  - Rolagem horizontal fluida e controle de zoom das teclas.
  - Troca de oitava (C1 a C6) e trava de tela.
  - Roda de **Pitch Bend** (que retorna ao centro) e **Modulação** (CC1).
- **Pads de Bateria (MPC Style):**
  - 16 pads divididos em 2 presets de 8 pads.
  - **Editor de Pads:** Permite alterar o nome, a cor e a nota MIDI de cada pad (salvo localmente).
- **Controles MIDI Avançados:**
  - Seletor de Canal MIDI (1 a 16) e Velocity independentes para teclado e pads.
  - Botão **MIDI Panic** para interromper notas presas.
  - Suporte a **Sustain Pedal** (CC64).
- **Conexão Flexível:**
  - Saída MIDI para aplicativos locais (Android MidiManager).
  - Suporte a **USB MIDI** e **Bluetooth BLE MIDI**.
- **Interface e Experiência:**
  - Tema escuro otimizado para uso em palco (Modo Palco / Tela Cheia).
  - Feedback tátil (Haptics) ao tocar nas teclas e nos pads.
  - Layout adaptável para orientação paisagem.

---

## 📸 Screenshots

*(Adicione aqui imagens do seu app rodando. Exemplo:)*

| Teclado | Pads |
| :---: | :---: |
| ![Teclado](https://via.placeholder.com/400x200?text=Screenshot+do+Teclado) | ![Pads](https://via.placeholder.com/400x200?text=Screenshot+dos+Pads) |

---

## 🛠️ Tecnologias Utilizadas

- **React 18** com **TypeScript** — Interface de usuário moderna e reativa.
- **Capacitor 6** — Para acesso às APIs nativas do Android (MIDI, Haptics, StatusBar).
- **Tailwind CSS** — Estilização rápida e responsiva.
- **Vite** — Build tool ultrarrápida.
- **Plugin Nativo Customizado (Android/Java)** — Para lidar com o MidiManager do Android e comunicação BLE.

---

## 🚀 Como Compilar o Projeto (Para Desenvolvedores)

Se você quer contribuir ou gerar seu próprio APK, siga os passos abaixo:

### Pré-requisitos
- Node.js (v18 ou superior)
- Android Studio (com Android SDK instalado)
- Java JDK 17 ou 21

### Passo a Passo

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/Teclado-e-Pads-MIDI.git
   cd Teclado-e-Pads-MIDIReadne
