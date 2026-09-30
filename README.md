# MedChecklist 🩺

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Nix Flake](https://img.shields.io/badge/Nix_Flake-Supported-5277C3.svg?logo=nixos)](flake.nix)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Encryption](https://img.shields.io/badge/Security-AES--256--GCM%20E2EE-emerald.svg)](src/utils/cryptoVault.ts)
[![CodeQL](https://github.com/dkchw/MedChecklist/actions/workflows/codeql.yml/badge.svg)](.github/workflows/codeql.yml)
[![Dependabot](https://img.shields.io/badge/Dependabot-Enabled-02569B.svg?logo=dependabot)](.github/dependabot.yml)

A minimalist, high-performance, clinical-grade medical checklist and patient encounter platform. Built around **Markdown as the single source of truth**, with zero-lag 120 FPS hardware stylus handwriting, client-side encryption at rest (AES-256-GCM), end-to-end encrypted (E2EE) P2P synchronization with QR code instant connection, patient ward & hospital facility grouping, HIPAA Safe Harbor de-identification & anonymization engine, built-in medical photo redaction suite, hospital lab reference range customization, rich image & link attachments, format-first LLM chatbox interoperability, and dual-layer synchronization (GitHub Private Repo with PAT + Local Offline P2P Wi-Fi Sync).

---

## 🌟 Key Highlights

### ⚡ Zero-Lag Predictable Performance Engine (120 FPS Inking)
- **Double-Buffered Canvas Rendering**: Static committed ink strokes are pre-rendered into an offscreen compositing buffer. Only the currently active stroke is rendered live on top, eliminating $O(N)$ re-drawing per touch sample.
- **Bypassed React State on PointerMove**: Raw stylus coordinates bypass React state churn during active drawing, using `requestAnimationFrame` and `event.getCoalescedEvents()` for sub-millisecond stroke latency and native 120 FPS stylus responsiveness.
- **Selective Immutable Mapping**: Eliminated JSON serialization deep-cloning across checklist toggles, lab edits, and note taking with $O(1)$ shallow path immutability.
- **Rollup Code Splitting**: Fine-grained vendor chunk isolation (`vendor-core`, `vendor-pdf-export`, `vendor-qr-crypto`, `vendor-icons`, `vendor-dexie-db`, `vendor-ink-engine`) ensuring instant web and app bundle load times.

---

### 🛡️ HIPAA Safe Harbor Clinical De-Identification Engine
- **Deterministic Pseudonymization**: Generates consistent anonymized patient identifiers (e.g. `Pt-ANON-78FA`) using SHA-256 cryptographic hashing of patient identifiers and salt, allowing consistent tracking across multiple anonymized notes.
- **10-Year Age Bracketing**: Automatically aggregates ages into standard clinical age cohorts (e.g., *73 yo* $\rightarrow$ *70-79 yo*; ages $>89$ categorized as *90+ yo*) per HIPAA §164.514(b)(2).
- **Automated PHI Scanning & Redaction**: Intelligent regex engine strips telephone numbers, MRNs, SSNs, dates of birth, geographic locations, and clinician signatures from chief complaints, notes, and checklist comments.
- **Relative Event Timelines**: Converts absolute timestamps into clinical relative offsets (e.g. `Day 1 (Encounter Start)`, `Day 2 (+24h)`) preventing chronological fingerprinting.
- **1-Click Share & Export**: Preview de-identified patient dossiers in clean GitHub Flavored Markdown or structured JSON, ready for external consults, morbidity & mortality reviews, or academic case studies.

---

### 🎨 Medical Photo Redaction & Editing Suite
- **HIPAA Privacy Warning Banners**: Prominent reminder in the patient image gallery alerting clinicians to redact protected health information (PHI) from ECG strips, bedside ultrasound screens, and clinical photos before sharing.
- **Built-in Redaction Tools**:
  - **Blackout Box**: Solid black rectangular redactions for patient demographic labels and hospital stickers.
  - **Pixelate / Blur**: Scrambles sensitive areas (e.g. facial features, identifiable tattoos) while preserving surrounding medical context.
  - **Whiteout Box**: Clean medical documentation whiteout.
  - **Redaction Marker**: Freehand thick redacting marker pen.
  - **Crop Tool**: Crops directly to the clinical area of interest (e.g. just the rhythm strip or wound site).
  - **`[REDACTED PHI]` Stamp**: Standardized regulatory redaction stamp.
- **Non-Destructive Options**: Save redactions as an in-place replacement or export a new tagged `#anonymized` copy.
- **Gallery Status Filter**: Instant gallery filtering between `All`, `✓ Anonymized`, and `⚠️ Needs Review`.

---

### 🔒 Client-Side Encryption at Rest & Security Vault
- **AES-256-GCM Encryption**: All local clinical encounters, patient records, notes, and lab data are encrypted at rest using the browser Web Crypto API.
- **Master Passphrase Vault**: Optional doctor-configured master passphrase with PBKDF2 (100,000 iterations) key derivation. When locked, patient data is completely shielded in memory and disk.
- **Seamless Local Key**: Devices operate smoothly with a hardware-bound device key while maintaining instant lock/unlock capabilities.

---

### 📶 P2P End-to-End Encryption (E2EE) with QR Code Connection
- **Zero-Knowledge Transport**: Direct peer-to-peer data sync between Android tablet and PC is encrypted end-to-end with AES-256-GCM so hospital Wi-Fi networks and intermediaries cannot inspect or modify patient data.
- **Instant QR Code Pairing**:
  - Display your device QR code on your tablet or PC.
  - Scan partner device QR code instantly via live camera video feed (`jsQR`) or image upload.
- **Saved Connected Devices**: Manage trusted paired devices with pairing dates, trust status, and instant 1-click encrypted export/import.

---

### 🏥 Multi-Level Organization (Hospital / Clinic & Ward Grouping)
- **Facility & Ward Hierarchy**: Group patients by both **Hospital / Clinic** (e.g. *St. Jude Medical Center*, *Metro General*, *Downtown Urgent Care*) and **Ward / Unit** (e.g. *ICU Bed 04*, *Emergency Room*, *Cardiology Stepdown*).
- **Instant Facility Datalists**: Type custom facilities or choose from previously saved clinics with auto-suggest.
- **Active Rounds vs. Archived History**:
  - Keep active rounds clean and uncluttered.
  - Archive discharged patients with full dossier history preserved.
  - Restore archived patients back to active rounds at any time with one click.

---

### ✍️ 3 Clinical Input Modes & Offline Handwriting OCR
- **Mode 1: Keyboard Only**: Distraction-free Markdown keyboard typing for detailed discharge notes and history.
- **Mode 2: Handwriting In Box (Field OCR)**:
  - Tap any vital sign box (Blood Pressure, Heart Rate, Respiratory Rate, Temp, SpO2), lab field, or Chief Complaint box to open an inline handwriting scratchpad.
  - Built-in **100% offline client-side digit and vitals OCR engine** recognizes numbers, decimals, and blood pressure patterns (`120/80`) with live confidence scoring, pre-configured units/converters, and 1-click apply.
- **Mode 3: Full Handwriting Bedside Canvas**:
  - **Hardware Pressure Sensitivity**: Dynamic stroke thickness reacting to physical pen pressure (`PointerEvent.pressure`).
  - **Stylus-Only Mode (Palm Rejection)**: Toggle **"Pen Only"** mode to reject all finger and palm touches, drawing exclusively when an active stylus/S-Pen is detected.
  - **Lasso & Irregular Selection**: Freely circle strokes with the irregular polygon lasso tool to translate, reposition, duplicate, or delete handwriting notes.
  - **Multi-Page Bedside Sheets**: Add additional pages (`+ Add Page`), navigate pages (`Page X of Y`), and delete sheets.
  - **4-Direction Infinite Canvas Expansion**: Expand canvas margins in any direction (Top ↑, Bottom ↓, Left ←, Right →).
  - **Dual-Layer Architecture**: The underlying clinical document displays live, selectable, and copyable text (`Select Text` mode). Adding or modifying keyboard text updates the background without erasing or shifting your handwritten ink layer.
  - **Multi-Format Exports**: Export multi-page handwriting dossiers directly to high-res PNG images or multi-page searchable clinical PDF (`jsPDF`).
  - **Default Viewer Mode Export**: Clean clinical Markdown report maintaining exact keyboard text and numbers while separating scratch drawings.

---

### 🧩 Checklist-First Architecture & Clinical Template Bundles
- **Checklists First (Atomic & Modular)**:
  - Atomic symptom checklists, lab panels, procedural safety checks, and hospital reference ranges.
  - Read and test checklists directly in the Checklist Library without needing to create a patient encounter.
  - Quick **Recall Question Mark (`?`)**: Tap the `?` button next to any checklist or item to instantly view clinical pearls, diagnostic criteria, and protocol guidance.
- **Clinical Template Bundles**:
  - Bundles that group multiple modular checklists with standard clinical protocol guidance and ward notes in Markdown (e.g. *Sepsis Resuscitation Bundle*, *Acute Chest Pain & ACS Protocol*, *ICU Multi-System Daily Rounds*).
- **Patient Dossiers**:
  - Initialized using a predefined template bundle, combined with additional checklists and custom clinical notes written via keyboard Markdown or stylus handwriting.
- **Rapid Checklist Duplication**: 1-click duplicate checklists inside active encounters or in the master checklist library.

---

### 🖊️ Stylus Barrel Button Eraser & Direct Pen Ticking
- **Physical Barrel Button Eraser**: Pressing and holding the physical hardware button on active styluses (Samsung S-Pen, USI, Wacom, Surface Pen) instantly switches the tool into an eraser on-the-fly (`e.buttons & 2`, `e.buttons & 32`, `e.button === 2 || 5`), reverting immediately back to your drawing tool when released with zero UI mode switching.
- **Direct Pen Ticking for Checklists**: Clinicians can check and uncheck protocol items directly using the pen tip (`data-checklist-item`). The canvas intelligently intercepts short taps and tick strokes over checklist items, toggling the item and keeping stray ink blobs off the sheet.
- **Theme-Adaptive Inking Color**: Default ink dynamically renders `#f8fafc` (crisp white) in dark mode and `#0f172a` (deep slate) in light mode, ensuring that notes and drawings remain perfectly legible regardless of theme changes.

---

### 🖥️ Tablet Landscape Dual-Column Split Panel
- **Optimized for Hospital Tablets & Desktop Monitors**: Responsive layout (`lg:grid lg:grid-cols-12`) that eliminates cumbersome vertical scrolling during rounds:
  - **Left Sticky Dossier (4 Cols)**: Patient identifier, bed number, facility & ward tags, age/sex, Chief Complaint with inline OCR scratchpad, quick tags, media attachments, 1-click Bedside Mode launcher, and an interactive **Protocol Navigator (TOC)** with live completion percentages and progress bars.
  - **Right Workspace (8 Cols)**: Full checklist protocols with laboratory reference bounds, clinical recall question marks (`?`), inline markdown notes, and 3-mode Bedside Clinical Notes (Text Only, Handwriting Only, and Handwriting-to-Text OCR).

---

### 📂 Unified Hierarchical Folder System (Facility → Ward)
- **Nested Clinical Tree**: Intuitive hierarchy of **Hospital / Clinic (Facility)** $\rightarrow$ **Ward / Unit** $\rightarrow$ **Patients & Protocols**.
- **Collapsible Tree Navigator**: Expand and collapse facility nodes, inspect bed counts and active patient volume, and assign patient encounters to specific wards directly from bedside rounds.

---

### 🧠 Clinical Knowledge Hub & Desktop Vault Sync (Obsidian, Zettlr, Markdown-Oxide)
- **Clinical Knowledge Hub**:
  - Markdown editor with **Edit**, **Split**, and **Live Preview** modes for medical study notes, clinical pearls, and protocol guidelines.
  - Seamlessly link checklists and templates with interactive protocol cards and standard Obsidian wikilinks `[[Protocol Name]]`.
  - Filter notes by Facility, Ward, or custom topic folders.
- **Bidirectional Desktop Vault Sync**:
  - Connect directly to your local desktop folder (e.g. an existing **Obsidian Vault** or **Zettlr** directory) using the Web File System Access API (`showDirectoryPicker`).
  - **Push & Pull**: Exports your entire clinical knowledge base into clean Markdown files on disk and automatically imports external `.md` notes.
- **100% Obsidian, Zettlr & Markdown-Oxide Compatible**:
  - **Structured Folders**: Organizes into `Clinical Protocols/`, `Clinical Templates/`, `Study Sessions/`, and `Knowledge Notes/Facility/Ward/`.
  - **Standard YAML Frontmatter**: Includes `title`, `tags`, `facility`, `ward`, `aliases`, `type`, and `updated` fields.
  - **Wikilinks & MOC**: Generates a root `README.md` Map of Content with `[[wikilinks]]` recognized natively by Obsidian, Zettlr, and the `markdown-oxide` Language Server Protocol.
  - **LSP Configuration**: Automatically generates `.obsidian/app.json` and `.moxide.toml` for out-of-the-box LSP diagnostics and autocompletion in VSCode, Neovim, and Helix.
  - **Offline ZIP Fallback**: 1-click download of the complete vault as a standalone `.zip` archive on any device.

---

### 📖 Interactive Checklist Reader & Saved Study Runs
- **Interactive Protocol Practice**: Click any checklist or template in the Knowledge Hub or Checklist Library to launch a dedicated protocol study modal without needing to create a patient encounter.
- **Saved Lesson Runs**: Checking items during study sessions or lectures does not mutate master protocols; clinicians can save their interactive run with custom lecture notes to the `checklistRuns` history table.

---

### 🌙 Dark Mode & High-Contrast Clinical Themes
- Comprehensive dark mode built with deep slate tones (`slate-900`/`slate-800`), crisp high-contrast text (`slate-100`/`slate-200`), distinct borders (`slate-700`), and accessible badge indicators.
- Eliminates low-contrast washed out gray-on-white text, providing comfortable night-shift readability in dark hospital rooms.

---

### 🤖 Format-First LLM Chatbox Interoperability
- **"Copy for LLM"**: Generates a prompt starting with **strict MedChecklist Markdown formatting instructions first**, followed by your clinical objective:
  - *Differential Diagnosis & Workup*: Analyzes positive findings and identifies missing red-flag symptoms/tests.
  - *Clinical SOAP Synthesis*: Formats findings into Subjective, Objective, Assessment, and Plan.
  - *Protocol & Checklist Expansion*: Expands criteria using international clinical guidelines.
- **"Paste from LLM"**: Real-time parser that recognizes `- [x]` positive findings, `- [ ]` pending workups, and Markdown notes from ChatGPT, Claude, or DeepSeek, offering an interactive preview before merging into the active encounter.

---

### 🔄 GitHub Private Repo (PAT) & Local P2P Sync
- **GitHub Private Repo Sync**:
  - Syncs structured Markdown files directly to your private GitHub repository using your Personal Access Token.
  - Full Git commit history provides version control, rollback safety, and complete audit trail.
  - Soft-deletes (`isDeleted: true` / tombstone) protect against accidental deletion across devices.
- **Local P2P Sync**:
  - Direct local network sync (export/import package) for hospital Wi-Fi when external internet or GitHub access is blocked.

---

### 🚀 In-App Multi-Platform Release Updater & Android Auto-Update
- **Automated GitHub Release Query**: Automatically checks the public GitHub repository for published releases and compares semantic versions.
- **Android Native In-App Auto-Update**:
  - **1-Click Auto-Update & Install**: Tapping "Auto-Update & Install" downloads the release APK directly in a background thread with automatic S3 redirect following.
  - **Live Progress Reporting**: Real-time progress bar shows download percentage, transfer speed, and megabytes downloaded directly in the app.
  - **System Package Installer Handshake**: On completion, automatically launches Android's system package installer (`Intent.ACTION_VIEW` via secure `FileProvider`).
  - **Unknown Sources Permission Management**: Automatically guides clinicians to Android's "Allow from this source" toggle on Android 8.0+ (Oreo, API 26+) and seamlessly resumes installation on return.
  - **Manual Update Check**: Clinicians can tap the header version badge (`vX.X.X`) at any time to instantly check for newer releases.
- **Desktop & Web Release Support**: Direct 1-click download links for Linux Desktop packages (`.tar.gz`) and Web bundles.

---

## 📦 Multi-Platform Releases & Installation

MedChecklist is released simultaneously for **Android**, **Linux Desktop**, and **Web**:

### 📱 1. Android Tablet / Phone
- **Download**: Download `medchecklist-vX.X.X.apk` from the [GitHub Releases](https://github.com/dkchw/MedChecklist/releases) page.
- **Features**: Full hardware S-Pen / stylus pressure sensitivity, offline handwriting OCR, camera QR scanner, offline local encryption, and **in-app auto-update directly from GitHub**.

### 💻 2. Linux Desktop Workstation
- **Download**: Download `medchecklist-vX.X.X-desktop-linux-x86_64.tar.gz` from [GitHub Releases](https://github.com/dkchw/MedChecklist/releases).
- **Run Standalone**:
  ```bash
  tar -xzf medchecklist-v*-desktop-linux-x86_64.tar.gz
  cd medchecklist-v*-desktop-linux-x86_64
  ./medchecklist-desktop.sh
  ```
- **NixOS / Nix Flake Workstation**:
  You can run MedChecklist directly on any Nix system without installing anything:
  ```bash
  # Run in debug mode (with browser DevTools enabled):
  nix run . -- --debug

  # Run standard workstation app mode:
  nix run .

  # Development shell:
  nix develop
  npm run dev
  ```

### 🌐 3. Standalone Web Deployment
- **Download**: Download `medchecklist-vX.X.X-web.tar.gz` from [GitHub Releases](https://github.com/dkchw/MedChecklist/releases).
- **Deploy**: Host with any static web server (Nginx, Caddy, Apache, Cloudflare Pages, Vercel, Netlify).

---

## 🔒 Security, Dependabot & CodeQL

- **Automated Security Analysis**: Integrated with GitHub CodeQL (`.github/workflows/codeql.yml`) targeting JavaScript/TypeScript and GitHub Actions.
- **Automated Dependency Updates**: Dependabot configured (`.github/dependabot.yml`) for `npm`, `github-actions`, and `gradle` ecosystems with weekly security reviews.
- **No Third-Party Analytics**: 100% telemetry-free and offline-capable.

---

## 📄 License

Licensed under the **Apache License, Version 2.0** (the "License"). You may obtain a copy of the License at:

```
http://www.apache.org/licenses/LICENSE-2.0
```
