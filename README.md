# 🎹 RT-Music

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

| Teclado | Pads |
| :---: | :---: |
|<img width="1600" height="738" alt="WhatsApp Image 2026-10-29 at 14 19 23" src="https://github.com/user-attachments/assets/dedd837d-8312-44dd-b1c6-282d3cd6fdfb" /> |<img width="1600" height="738" alt="PADS" src="https://github.com/user-attachments/assets/2ad01e27-7d9e-4e26-8c17-c8d1b63db850" />

---

## 🗺️ Roadmap (Próximas Atualizações)
- **Suporte a escalas musicais** (ex: Pentatônica).
- **Modo Retrato** (Portrait) otimizado.
- **Gravação de performances** (MIDI File Export).
- **Metrônomo integrado**.

## 📄 Licença
Copyright (c) [2026] [Rodolpho Roger Friedrich Alves] (RT-Music)

Todos os direitos reservados.

Este software e seu código-fonte são propriedade exclusiva do autor.
Nenhuma parte deste software pode ser reproduzida, distribuída, modificada ou utilizada de qualquer forma, comercial ou não, sem a permissão prévia e por escrito do detentor dos direitos autorais.

---

## 🛠️ Tecnologias Utilizadas

- **React 18** com **TypeScript** — Interface de usuário moderna e reativa.
- **Capacitor 6** — Para acesso às APIs nativas do Android (MIDI, Haptics, StatusBar).
- **Tailwind CSS** — Estilização rápida e responsiva.
- **Vite** — Build tool ultrarrápida.
- **Plugin Nativo Customizado (Android/Java)** — Para lidar com o MidiManager do Android e comunicação BLE.

---
👤 Autor
Rodolpho

GitHub: @rodolphophfriedrich-gif
