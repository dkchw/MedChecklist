# MedChecklist 🩺 (v2.0.0 Native)

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Android Native](https://img.shields.io/badge/Android-Jetpack%20Compose-3DDC84.svg?logo=android)](android/)
[![Qt6 Desktop](https://img.shields.io/badge/Desktop-Qt6%20C%2B%2B-41CD52.svg?logo=qt)](desktop/)
[![Nix Flake](https://img.shields.io/badge/Nix_Flake-NixOS%20Supported-5277C3.svg?logo=nixos)](desktop/flake.nix)

A minimalist, high-performance, clinical-grade medical checklist and patient encounter workstation. Fully rewritten into pure native codebases: **Kotlin & Jetpack Compose** for Android tablets, and **C++17 & Qt6** with **Nix Flake** for desktop workstations.

---

## 🏗️ Architecture Overview

MedChecklist is split into two native, standalone implementations:

### 1. 🤖 Android Tablet (`android/`)
- **UI Framework**: Pure Jetpack Compose with Material 3.
- **Inking Engine**: Direct hardware `MotionEvent` sampling with historical sub-frame coalesced points (`event.getHistoricalX/Y`), eliminating WebView latency.
- **Hardware Stylus Palm Rejection**: Filters out non-stylus touch events at the driver level (`TOOL_TYPE_STYLUS`).
- **Database**: SQLite backed by Android Room DAOs (`EncounterDao`, `InkStrokeDao`, `ChecklistDao`, `FolderDao`, `TemplateDao`).
- **Tools**: Ballpoint Pen, Fluorescent Highlighter, Dynamic Stroke Eraser, multi-page vector sheets, and clinical dossier view.

### 2. 💻 PC & Desktop Workstation (`desktop/`)
- **Technology**: C++17, Qt6 (Widgets, Sql, PrintSupport, Wayland).
- **Inking Engine**: High-fidelity `QGraphicsView` infinite canvas with Wacom / digitizer stylus pressure sensitivity (`QTabletEvent`).
- **Database**: Local SQLite database via `QSqlDatabase` with auto-migration and clinical protocol seeder.
- **Vector PDF Export**: One-click generation of A4 vector clinical dossiers (`QPdfWriter`).
- **NixOS Support**: First-class `flake.nix` with both `nix develop` (development shell) and `nix build` (standalone package).

---

## 🚀 Getting Started

### 📱 Android
1. **Pre-built APK**: Download `medchecklist-v2.0.0.apk` from the latest [GitHub Releases](https://github.com/dkchw/MedChecklist/releases).
2. **Build from source**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
   The signed release APK will be located in `android/app/build/outputs/apk/release/app-release.apk`.

---

### 💻 Desktop (NixOS / Linux)

#### Using Nix Flake (Recommended for NixOS)
```bash
cd desktop

# Option A: Enter development shell
nix develop
cmake -B build
cmake --build build
./build/MedChecklistDesktop

# Option B: Direct Nix build
nix build
./result/bin/MedChecklistDesktop
```

#### Using Standard CMake & Qt6
Ensure Qt6 development packages (`qt6-base-dev`, `qt6-declarative-dev`) and CMake are installed:
```bash
cd desktop
cmake -B build
cmake --build build
./build/MedChecklistDesktop
```

---

## 📄 License
Licensed under the [Apache License, Version 2.0](LICENSE).
