# MedChecklist 🩺

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Nix Flake](https://img.shields.io/badge/Nix_Flake-Supported-5277C3.svg?logo=nixos)](flake.nix)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)

A minimalist, high-performance, clinical-grade medical checklist and patient encounter platform. Built around **Markdown as the single source of truth**, with full tablet stylus/pen handwriting support for bedside rounds, hospital lab reference range customization, rich image & link attachments, format-first LLM/chatbox interoperability, and dual-layer synchronization (GitHub Private Repo with PAT + Local Offline P2P Wi-Fi Sync).

---

## 🌟 Key Highlights

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

### 🏥 Hospital-Customizable Templates & Lab References
- Modify normal reference bounds (e.g., high-sensitivity Troponin cutoffs, Potassium ranges) for your specific hospital or laboratory.
- Switch seamlessly between Visual Form Editing and Direct Raw Markdown editing.
- Pre-loaded with standard clinical protocols:
  1. **Review of Systems & History (H&P)**
  2. **Hospital Lab Reference Ranges Panel** (CBC, BMP, Cardiac Biomarkers, Coagulation)
  3. **Emergency Chest Pain / ACS Triage Protocol**
  4. **Sepsis 3.0 & SOFA Quick Resuscitation Bundle**
  5. **Pre-Operative Assessment & Clearance Protocol**

### 👥 Multi-Patient Encounter Group Boxes
- Tabbed bedside workspace for tracking multiple patients simultaneously (e.g. Bed 4, Bed 7, Outpatient 101).
- Attach any combination of checklists and protocols to a patient dossier.
- Enter distraction-free Bedside Mode with one click.

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
   - Download the APK directly from the [GitHub Releases](https://github.com/dkchw/MedChecklist/releases) page.
   - Built with full hardware stylus and S-Pen pressure support.
2. **Bedside Inking**:
   - Tap "Bedside Mode (Pen / Stylus)" on any patient encounter.
   - Use the floating pen toolbar to select your pen, highlighter, or eraser.
   - Tap "Add Symptom" to write down unlisted symptoms on the fly.

---

## 📝 Markdown Specification Reference

MedChecklist interprets standard GFM:

```markdown
# Encounter: Bed 4 - Doe, J.
> Age: 62 | Sex: M | Bed/Room: 4A | Status: active
> Chief Complaint: Acute retrosternal chest pain
> Tags: #cardio #urgent #triage
> Clinical References: [UpToDate: ACS Evaluation](https://www.uptodate.com/...)

---
### Checklist: Emergency Chest Pain / ACS Protocol (AHA/ACC Guidelines)

#### Initial Red Flags & Presentation
- [x] Pain radiating to left shoulder/arm or jaw *starred*
  > Note: Radiating to left shoulder & arm for 90 minutes
- [x] Associated diaphoresis, dyspnea, nausea
  > Note: Profuse sweating upon EMS arrival
- [ ] Hemodynamic instability (BP < 90 mmHg or HR > 110) *starred*
  > Note: BP 138/84, HR 88
- [x] Relief with sublingual nitroglycerin
  > Note: Pain reduced from 8/10 to 4/10

#### Cardiac Biomarkers & Coagulation
- [x] High-Sensitivity Troponin I: 148 ng/L (Elevated) [Normal: < 14 ng/L (Normal)] *starred*
  > Note: Stat delta troponin ordered in 1 hour
- [ ] INR (International Normalized Ratio): 1.0 [Normal: 0.8 - 1.1]

---
### Attached Clinical Images
![12-Lead ECG showing deep TWI in V3-V5](data:image/png;base64,...)

---
### Bedside & Handwritten Notes (Editable MD)
- Bedside ECG: T-wave inversion in V3-V5
- Sublingual nitro x1 administered at 14:15, partial relief
- Cardiology fellow on call paged
```

---

## 📄 License

Licensed under the **Apache License, Version 2.0** (the "License"). You may obtain a copy of the License in the [LICENSE](LICENSE) file or at:

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)
