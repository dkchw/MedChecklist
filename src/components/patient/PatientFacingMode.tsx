import React, { useState, useEffect, useRef } from 'react';
import { PatientEncounter, EncounterChecklistInstance } from '../../types/patient';
import { InkStroke, PenTool } from '../../types/ink';
import { PenCanvas } from '../pen/PenCanvas';
import { PenToolbar } from '../pen/PenToolbar';
import { jsPDF } from 'jspdf';
import {
  PenTool as PenToolIcon,
  CheckSquare,
  Sparkles,
  ArrowLeft,
  Plus,
  Star,
  FileText,
  Sliders,
  Check,
  Building2,
  Trash2,
  Download,
  FileDown,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface PatientFacingModeProps {
  encounter: PatientEncounter;
  onUpdateEncounter: (updated: PatientEncounter) => void;
  onExit: () => void;
  onOpenLlmModal: () => void;
  onOpenTemplateEditor: (templateId: string) => void;
}

export const PatientFacingMode: React.FC<PatientFacingModeProps> = ({
  encounter,
  onUpdateEncounter,
  onExit,
  onOpenLlmModal,
  onOpenTemplateEditor,
}) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  // Modes: 'pen' | 'interactive_text'
  const [isPenMode, setIsPenMode] = useState<boolean>(true);
  const [currentTool, setCurrentTool] = useState<PenTool>('pen');
  const [currentColor, setCurrentColor] = useState<string>(isDark ? '#f8fafc' : '#0f172a');
  const [currentSize, setCurrentSize] = useState<number>(3);
  const [undoStack, setUndoStack] = useState<InkStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<InkStroke[][]>([]);

  // Multi-page state
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const pagesCount = encounter.pagesCount || 1;

  // 4-Direction Pan & Zoom state
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);

  const [quickItemText, setQuickItemText] = useState('');
  const [showAddQuickItem, setShowAddQuickItem] = useState(false);
  const documentContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync pen color when theme changes
  useEffect(() => {
    if (isDark && currentColor === '#0f172a') {
      setCurrentColor('#f8fafc');
    } else if (!isDark && currentColor === '#f8fafc') {
      setCurrentColor('#0f172a');
    }
  }, [isDark]);

  const strokes = encounter.inkStrokes || [];

  const handleUpdateStrokes = (newStrokes: InkStroke[]) => {
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    onUpdateEncounter({
      ...encounter,
      inkStrokes: newStrokes,
      updatedAt: Date.now(),
    });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setRedoStack((r) => [...r, strokes]);
    onUpdateEncounter({
      ...encounter,
      inkStrokes: prev,
      updatedAt: Date.now(),
    });
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setUndoStack((u) => [...u, strokes]);
    onUpdateEncounter({
      ...encounter,
      inkStrokes: next,
      updatedAt: Date.now(),
    });
  };

  const handleClearStrokes = () => {
    const pageStrokes = strokes.filter((s) => (s.pageIndex ?? 0) === currentPageIndex);
    if (pageStrokes.length === 0) return;

    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    const remaining = strokes.filter((s) => (s.pageIndex ?? 0) !== currentPageIndex);
    onUpdateEncounter({
      ...encounter,
      inkStrokes: remaining,
      updatedAt: Date.now(),
    });
  };

  // Page Management
  const handleAddPage = () => {
    const newCount = pagesCount + 1;
    onUpdateEncounter({
      ...encounter,
      pagesCount: newCount,
      updatedAt: Date.now(),
    });
    setCurrentPageIndex(newCount - 1);
  };

  const handleDeletePage = () => {
    if (pagesCount <= 1) return;
    const remainingStrokes = strokes
      .filter((s) => (s.pageIndex ?? 0) !== currentPageIndex)
      .map((s) => ({
        ...s,
        pageIndex: (s.pageIndex ?? 0) > currentPageIndex ? (s.pageIndex ?? 0) - 1 : (s.pageIndex ?? 0),
      }));

    onUpdateEncounter({
      ...encounter,
      pagesCount: pagesCount - 1,
      inkStrokes: remainingStrokes,
      updatedAt: Date.now(),
    });
    setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
  };

  // 4-Direction Canvas Expansion
  const handlePan = (dx: number, dy: number) => {
    setPanX((prev) => prev + dx);
    setPanY((prev) => prev + dy);
  };

  const handleResetView = () => {
    setPanX(0);
    setPanY(0);
    setZoom(1);
  };

  // Toggle item checked
  const handleToggleItem = (checklistIdx: number, sectionIdx: number, itemIdx: number) => {
    const updated = JSON.parse(JSON.stringify(encounter)) as PatientEncounter;
    const item = updated.checklists[checklistIdx].sections[sectionIdx].items[itemIdx];
    item.checked = !item.checked;
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);

    if (item.checked && item.starred) {
      confetti({
        particleCount: 20,
        spread: 40,
        origin: { y: 0.8 },
      });
    }
  };

  // Quick add missing symptom on the fly
  const handleAddQuickItem = () => {
    if (!quickItemText.trim() || encounter.checklists.length === 0) return;
    const updated = JSON.parse(JSON.stringify(encounter)) as PatientEncounter;
    updated.checklists[0].sections[0].items.push({
      id: 'quick-' + Date.now(),
      text: quickItemText.trim(),
      checked: true,
    });
    updated.updatedAt = Date.now();
    onUpdateEncounter(updated);
    setQuickItemText('');
    setShowAddQuickItem(false);
  };

  // Export Full Handwriting & Document to PDF via jsPDF
  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    for (let p = 0; p < pagesCount; p++) {
      if (p > 0) doc.addPage();

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`MedChecklist: ${encounter.patientIdentifier}`, margin, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      const meta = [
        encounter.bedNumber ? `Bed: ${encounter.bedNumber}` : null,
        encounter.group ? `Ward: ${encounter.group}` : null,
        encounter.age ? `Age: ${encounter.age}` : null,
        encounter.sex ? `Sex: ${encounter.sex}` : null,
      ]
        .filter(Boolean)
        .join(' | ');
      doc.text(meta || 'Bedside Rounds Dossier', margin, 26);
      if (encounter.chiefComplaint) {
        doc.text(`Chief Complaint: ${encounter.chiefComplaint}`, margin, 32);
      }

      doc.setDrawColor(200);
      doc.line(margin, 36, pageWidth - margin, 36);

      // Checklists & Sections
      let currentY = 44;
      doc.setTextColor(20);

      if (p === 0) {
        for (const chk of encounter.checklists) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text(chk.title, margin, currentY);
          currentY += 6;

          for (const sec of chk.sections) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(80);
            doc.text(sec.title, margin + 2, currentY);
            currentY += 5;

            for (const itm of sec.items) {
              doc.setFontSize(9);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(30);
              const mark = itm.checked ? '[X]' : '[  ]';
              const text = `${mark} ${itm.text}${itm.referenceValue ? ` (${itm.referenceValue})` : ''}${
                itm.labValue ? ` -> ${itm.labValue}` : ''
              }`;
              doc.text(text, margin + 4, currentY);
              currentY += 5;
              if (currentY > 260) break;
            }
            currentY += 3;
            if (currentY > 260) break;
          }
          if (currentY > 260) break;
        }

        if (encounter.generalNotes && currentY < 240) {
          currentY += 4;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Bedside Clinical Notes:', margin, currentY);
          currentY += 5;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          const lines = doc.splitTextToSize(encounter.generalNotes, pageWidth - margin * 2);
          doc.text(lines, margin, currentY);
        }
      } else {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Handwritten Continuation Sheet - Page ${p + 1}`, margin, currentY);
        currentY += 10;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120);
        doc.text('Full stylus ink layer preserved below.', margin, currentY);
      }

      // Draw handwriting stroke representation on PDF
      const pageStrokes = strokes.filter((s) => (s.pageIndex ?? 0) === p);
      if (pageStrokes.length > 0) {
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.4);
        for (const stroke of pageStrokes) {
          if (stroke.points.length < 2) continue;
          // Scale from web pixels to mm (approx 0.264 mm/px)
          const scale = 0.22;
          for (let i = 1; i < stroke.points.length; i++) {
            const p1 = stroke.points[i - 1];
            const p2 = stroke.points[i];
            const x1 = Math.min(pageWidth - margin, margin + p1.x * scale);
            const y1 = Math.min(285, 30 + p1.y * scale);
            const x2 = Math.min(pageWidth - margin, margin + p2.x * scale);
            const y2 = Math.min(285, 30 + p2.y * scale);
            doc.line(x1, y1, x2, y2);
          }
        }
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `MedChecklist Document • Page ${p + 1} of ${pagesCount} • Exported ${new Date().toLocaleDateString()}`,
        margin,
        290
      );
    }

    doc.save(`${encounter.patientIdentifier.replace(/[^a-zA-Z0-9_-]/g, '_')}_bedside_rounds.pdf`);
  };

  // Export current page as image
  const handleExportImage = () => {
    const canvas = documentContainerRef.current?.querySelector('canvas');
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${encounter.patientIdentifier.replace(/[^a-zA-Z0-9_-]/g, '_')}_page${currentPageIndex + 1}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative select-none transition-colors">
      {/* Top Clinical Bedside Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Bedside</span>
          </button>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Patient Details */}
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>{encounter.patientIdentifier}</span>
              {encounter.bedNumber && (
                <span className="text-[11px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-900">
                  Bed {encounter.bedNumber}
                </span>
              )}
              {encounter.group && (
                <span className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium px-2 py-0.5 rounded-md">
                  {encounter.group}
                </span>
              )}
            </div>
            {encounter.chiefComplaint && (
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm sm:max-w-md">
                Complaint: {encounter.chiefComplaint}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Multi-Page Navigation */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
              disabled={currentPageIndex === 0}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded-lg"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-bold px-2 text-slate-700 dark:text-slate-300 min-w-16 text-center">
              Page {currentPageIndex + 1} / {pagesCount}
            </span>

            <button
              onClick={() => setCurrentPageIndex((p) => Math.min(pagesCount - 1, p + 1))}
              disabled={currentPageIndex >= pagesCount - 1}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 rounded-lg"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleAddPage}
              className="px-2 py-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1 transition-colors"
              title="Add New Blank Page"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Page</span>
            </button>
          </div>

          {/* Mode Switcher: Pen Inking vs Text Select / Interactive */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setIsPenMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isPenMode
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PenToolIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Pen Mode</span>
            </button>
            <button
              onClick={() => setIsPenMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                !isPenMode
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Allow selecting text and checking boxes underneath ink"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select Text</span>
            </button>
          </div>

          {/* 4-Direction Expand & Pan Controls */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => handlePan(0, 150)}
              className="px-1.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
              title="Expand Up"
            >
              ↑ Top
            </button>
            <button
              onClick={() => handlePan(0, -150)}
              className="px-1.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
              title="Expand Down"
            >
              ↓ Btm
            </button>
            <button
              onClick={() => handlePan(150, 0)}
              className="px-1.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
              title="Expand Left"
            >
              ← Left
            </button>
            <button
              onClick={() => handlePan(-150, 0)}
              className="px-1.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded"
              title="Expand Right"
            >
              → Right
            </button>
            {(panX !== 0 || panY !== 0 || zoom !== 1) && (
              <button
                onClick={handleResetView}
                className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded"
                title="Reset View to Center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              title="Export Multi-Page PDF with Selectable Document & Handwriting"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleExportImage}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Export Current Page as Image"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dual-Layer Document Area */}
      <div
        ref={documentContainerRef}
        className="flex-1 relative overflow-auto p-4 sm:p-8 flex items-start justify-center"
      >
        {/* Paper-Like Document Sheet */}
        <div
          className="relative bg-white dark:bg-slate-900 shadow-2xl rounded-2xl border border-slate-200/90 dark:border-slate-800 w-full max-w-4xl min-h-[900px] p-8 sm:p-12 transition-transform duration-75 select-text"
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Transparent Stylus Inking Overlay */}
          {isPenMode && (
            <PenCanvas
              strokes={strokes}
              onChangeStrokes={handleUpdateStrokes}
              tool={currentTool}
              color={currentColor}
              size={currentSize}
              pageIndex={currentPageIndex}
              panX={0}
              panY={0}
              zoom={1}
            />
          )}

          {/* Base Document Layer: Selectable Text & Numbers */}
          <div className="relative z-10 select-text pointer-events-auto">
            {/* Sheet Page 1: Clinical Dossier Layout */}
            {currentPageIndex === 0 ? (
              <div className="space-y-8">
                {/* Dossier Sheet Header */}
                <div className="border-b-2 border-slate-900 dark:border-slate-200 pb-4 flex items-start justify-between">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                      {encounter.patientIdentifier}
                    </h1>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {encounter.bedNumber && <span>Bed: {encounter.bedNumber}</span>}
                      {encounter.group && <span>Ward: {encounter.group}</span>}
                      {encounter.age && <span>Age: {encounter.age}</span>}
                      {encounter.sex && <span>Sex: {encounter.sex}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Bedside Dossier
                    </span>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {new Date(encounter.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Chief Complaint */}
                {encounter.chiefComplaint && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Chief Complaint / Presentation:
                    </span>
                    <p className="text-xs text-slate-900 dark:text-slate-100 mt-0.5">
                      {encounter.chiefComplaint}
                    </p>
                  </div>
                )}

                {/* Checklists and Sections */}
                {encounter.checklists.map((chk, chkIdx) => (
                  <div key={chk.id} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        {chk.title}
                      </h2>
                      {chk.institution && (
                        <span className="text-[11px] text-slate-400">
                          {chk.institution}
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      {chk.sections.map((sec, secIdx) => (
                        <div key={sec.id} className="space-y-1.5">
                          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {sec.title}
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {sec.items.map((item, itemIdx) => (
                              <div
                                key={item.id}
                                onClick={() => !isPenMode && handleToggleItem(chkIdx, secIdx, itemIdx)}
                                className={`p-2.5 rounded-xl border text-xs transition-colors flex items-start gap-2.5 select-text ${
                                  item.checked
                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() => handleToggleItem(chkIdx, secIdx, itemIdx)}
                                  className="mt-0.5 rounded text-emerald-600 cursor-pointer pointer-events-auto"
                                />
                                <div className="flex-1 min-w-0">
                                  <span
                                    className={`font-medium ${
                                      item.checked
                                        ? 'text-emerald-900 dark:text-emerald-200 font-bold'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    {item.text}
                                  </span>
                                  {item.referenceValue && (
                                    <span className="block text-[11px] text-slate-400">
                                      Ref: {item.referenceValue}
                                    </span>
                                  )}
                                  {item.labValue && (
                                    <span className="block text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold font-mono">
                                      Recorded: {item.labValue}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Bedside Notes */}
                {encounter.generalNotes && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Bedside Clinical Notes:
                    </h3>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed select-text">
                      {encounter.generalNotes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Continuation Sheets (Pages 2, 3...) */
              <div className="min-h-[700px] flex flex-col justify-between">
                <div className="border-b border-slate-200 dark:border-slate-700 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Handwritten Bedside Sheet — Page {currentPageIndex + 1}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Patient: {encounter.patientIdentifier} {encounter.bedNumber ? `(Bed ${encounter.bedNumber})` : ''}
                    </p>
                  </div>

                  <button
                    onClick={handleDeletePage}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg text-xs flex items-center gap-1"
                    title="Delete This Page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Sheet</span>
                  </button>
                </div>

                <div className="flex-1 flex items-center justify-center text-slate-300 dark:text-slate-700 select-none text-xs italic pointer-events-none">
                  Write notes, organ system diagrams, ECG annotations, or clinical sketches on this sheet
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>MedChecklist Continuation Sheet</span>
                  <span>Page {currentPageIndex + 1} of {pagesCount}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Stylus Toolbar (when in Pen Mode) */}
      {isPenMode && (
        <PenToolbar
          currentTool={currentTool}
          onSelectTool={setCurrentTool}
          currentColor={currentColor}
          onSelectColor={setCurrentColor}
          currentSize={currentSize}
          onSelectSize={setCurrentSize}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClearStrokes}
          onClose={() => setIsPenMode(false)}
        />
      )}
    </div>
  );
};
