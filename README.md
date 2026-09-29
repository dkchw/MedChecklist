# MedChecklist 🩺

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Nix Flake](https://img.shields.io/badge/Nix_Flake-Supported-5277C3.svg?logo=nixos)](flake.nix)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Encryption](https://img.shields.io/badge/Security-AES--256--GCM%20E2EE-emerald.svg)](src/utils/cryptoVault.ts)

A minimalist, high-performance, clinical-grade medical checklist and patient encounter platform. Built around **Markdown as the single source of truth**, with full tablet stylus/pen handwriting support for bedside rounds, client-side encryption at rest (AES-256-GCM), end-to-end encrypted (E2EE) P2P synchronization with QR code instant connection, patient ward grouping and archiving, hospital lab reference range customization, rich image & link attachments, format-first LLM chatbox interoperability, and dual-layer synchronization (GitHub Private Repo with PAT + Local Offline P2P Wi-Fi Sync).

---

## 🌟 Key Highlights

### 🔒 Client-Side Encryption at Rest & Security Vault
- **AES-256-GCM Encryption**: All local clinical encounters, patient records, notes, and lab data are encrypted at rest using Web Crypto API.
- **Master Passphrase Vault**: Optional doctor-configured master passphrase with PBKDF2 (100,000 iterations) key derivation. When locked, patient data is completely shielded in memory and disk.
- **Seamless Local Key**: Devices operate smoothly with a hardware-bound device key while maintaining instant lock/unlock capabilities.

### 📶 P2P End-to-End Encryption (E2EE) with QR Code Connection
- **Zero-Knowledge Transport**: Direct peer-to-peer data sync between Android tablet and PC is encrypted end-to-end with AES-256-GCM so hospital Wi-Fi networks and intermediaries cannot inspect or modify patient data.
- **Instant QR Code Pairing**:
  - Show your device QR code on your tablet or PC.
  - Scan partner device QR code instantly via live camera video feed (`jsQR`) or image upload.
- **Saved Connected Devices**: Manage trusted paired devices with pairing dates, trust status, and instant 1-click encrypted export/import.

### 🏥 Ward Grouping & Patient Archiving
- **Ward / Unit Grouping**: Organize bedside rounds by unit (e.g. *Emergency*, *ICU*, *Internal Med*, *Cardiology*, *Surgery*, or custom ward tags). Filter bedside rounds with one click.
- **Active Rounds vs. Archived History**:
  - Keep active rounds clean and uncluttered.
  - Archive discharged patients with full dossier history preserved.
  - Restore archived patients back to active rounds at any time with one click.

### 🧩 Checklist-First Architecture & Clinical Template Bundles
- **Checklists First (Atomic & Modular)**:
  - Atomic symptom checklists, lab panels, procedural safety checks, and hospital reference ranges.
  - Edit visually or via raw GitHub Flavored Markdown (GFM).
- **Clinical Template Bundles**:
  - Bundles that group multiple modular checklists with standard clinical protocol guidance and ward notes in Markdown (e.g. *Sepsis Resuscitation Bundle*, *Acute Chest Pain & ACS Protocol*, *ICU Multi-System Daily Rounds*).
- **Patient Dossiers**:
  - Initialized using a predefined template bundle, combined with additional checklists and custom clinical notes written via keyboard Markdown or stylus handwriting.

### 📋 Markdown-First Universal Core
- Every checklist item, clinical observation, hospital reference range, and patient encounter dossier is structured in standard **GitHub Flavored Markdown (GFM)**:
  - `- [ ] Unchecked / pending / negative symptom`
  - `- [x] Checked / positive finding`
  - `*starred*` or `⭐` for high-priority red flags
  - `> Note: ...` for item clinical notes
  - `[Normal: <range>]` with patient lab values
  - `![Caption](url)` for attached clinical snapshots (ECGs, rashes, wound progress)
  - `[UpToDate: Topic](url)` for medical guidelines & literature links
  - `### Bedside & Handwritten Notes (Editable MD)` — keyboard-editable Markdown notes that can also be annotated with pen!
- Fully interoperable with Obsidian, Neovim, VSCode, and Git.

### ✍️ Bedside Patient-Facing & Pen/Tablet Mode
- Designed for Android tablets (Samsung S-Pen, active stylus, USI pen) and desktop touchscreens:
  - **Fluid Vector Inking**: Sub-10ms response time powered by `perfect-freehand`.
  - **Hardware Pressure Sensitivity**: Dynamic stroke thickness reacting to physical pen pressure (`PointerEvent.pressure`).
  - **Palm Rejection Friendly**: Distinct pointer handling between pen gestures and palm touches.
  - **Minimal Floating Stylus Bar**: Ballpoint pen (Clinical Black, Medical Blue, Red, Amber, Green), Fluorescent Highlighter (Semi-transparent Yellow, Mint, Cyan), Stroke Eraser, Undo/Redo stack.
  - **Direct Ticking & Margin Scratchpad**: Tap or tick across symptoms with the pen, or write bedside margin notes.
  - **Quick Add Symptom**: Write or type unlisted symptoms on the fly directly at the bedside.

### 🖼️ Rich Media & Medical Reference Links
- **Clinical Image Attachments**: Attach ECG rhythm strips, wound progression photos, bedside ultrasounds, or rash images via file picker, camera capture, or direct clipboard paste (`Ctrl+V`). Includes full-resolution lightbox viewer.
- **Evidence-Based Medical Links**: Embed direct links to **UpToDate**, **PubMed**, **Wikipedia**, **YouTube clinical procedures**, and hospital intranet protocols with clickable badges.

### 🤖 Format-First LLM Chatbox Interoperability
- **"Copy for LLM"**: Generates a prompt starting with **strict MedChecklist Markdown formatting instructions first**, followed by your clinical objective:
  - *Differential Diagnosis & Workup*: Analyzes positive findings and identifies missing red-flag symptoms/tests.
  - *Clinical SOAP Synthesis*: Formats findings into Subjective, Objective, Assessment, and Plan.
  - *Protocol & Checklist Expansion*: Expands criteria using international clinical guidelines.
- **"Paste from LLM"**: Real-time parser that recognizes `- [x]` positive findings, `- [ ]` pending workups, and Markdown notes from ChatGPT, Claude, or DeepSeek, offering an interactive preview before merging into the active encounter.

### 🔄 GitHub Private Repo (PAT) & Local P2P Sync
- **GitHub Private Repo Sync**:
  - Syncs structured Markdown files directly to your private GitHub repository using your Personal Access Token.
  - Full Git commit history provides version control, rollback safety, and complete audit trail.
  - Soft-deletes (`isDeleted: true` / tombstone) protect against accidental deletion across devices.
- **Local P2P Sync**:
  - Direct local network sync (export/import package) for hospital Wi-Fi when external internet or GitHub access is blocked.

### 🚀 In-App GitHub Releases Updater
- Direct update notification banner when a new release is published to GitHub.
- Direct download links for Android APK and Linux packages without requiring Google Play Store.

---

## 💻 Desktop Workstation (Linux / NixOS)

### Running on NixOS
You can test and run the desktop version immediately using the provided Nix flake:

```bash
# Test the desktop version in debug mode (with DevTools enabled):
nix run . -- --debug

# Test normal desktop mode:
nix run .

# Or enter the reproducible development shell:
nix develop
npm run dev
```

---

## 📱 Android Tablet Setup

1. **Install Android APK**:
   - Download the APK directly from the [GitHub Releases](https://github.com/dkchw/MedChecklist/releases) page (`medchecklist-v1.0.0.apk`).
   - Built with full hardware stylus and S-Pen pressure support.
2. **Bedside Inking**:
   - Open any active patient encounter.
   - Tap **"Bedside Mode (Pen / Stylus)"** to enter the clean, paper-like interface with vector pen and highlighter tools.
3. **P2P E2EE Connection**:
   - Tap the Wi-Fi icon in the header, choose **"Pair (QR)"**, and scan your PC's QR code with the tablet camera to establish trusted encrypted sync.

---

## 📄 License

Licensed under the **Apache License, Version 2.0** (the "License"). You may obtain a copy of the License at:

```
http://www.apache.org/licenses/LICENSE-2.0
```
