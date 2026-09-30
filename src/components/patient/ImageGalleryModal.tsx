import React, { useState } from 'react';
import { MedicalImage } from '../../types/checklist';
import { PatientEncounter } from '../../types/patient';
import {
  Image as ImageIcon,
  Tag,
  Plus,
  Trash2,
  X,
  Maximize2,
  Search,
  Filter,
  Download,
  ShieldCheck,
  AlertTriangle,
  EyeOff,
  PenTool,
  Check,
} from 'lucide-react';
import { ImageEditorModal } from '../common/ImageEditorModal';

interface ImageGalleryModalProps {
  encounters: PatientEncounter[];
  selectedEncounterId?: string | null;
  onUpdateEncounter: (encounter: PatientEncounter) => void;
  onClose: () => void;
}

const COMMON_IMAGE_TAGS = ['ecg', 'stemi', 'wound', 'rash', 'chest-xray', 'ultrasound', 'lab'];

export const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  encounters,
  selectedEncounterId,
  onUpdateEncounter,
  onClose,
}) => {
  const [filterPatientId, setFilterPatientId] = useState<string>(selectedEncounterId || 'all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'anonymized' | 'needs_review'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLightbox, setActiveLightbox] = useState<(MedicalImage & { encounterId: string }) | null>(null);

  // Photo editing & redaction modal state
  const [editingImage, setEditingImage] = useState<(MedicalImage & { encounterId: string }) | null>(null);

  // Tag editing state
  const [tagInputImageId, setTagInputImageId] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState('');

  // Collect all images from encounters
  const allImages: Array<MedicalImage & { encounterId: string; patientIdentifier: string; bedNumber?: string }> = [];

  for (const enc of encounters) {
    if (enc.isDeleted) continue;
    if (filterPatientId !== 'all' && enc.id !== filterPatientId) continue;

    // Encounter level images
    for (const img of enc.images || []) {
      allImages.push({
        ...img,
        encounterId: enc.id,
        patientIdentifier: enc.patientIdentifier,
        bedNumber: enc.bedNumber,
      });
    }

    // Checklist level images
    for (const chk of enc.checklists || []) {
      for (const sec of chk.sections || []) {
        for (const itm of sec.items || []) {
          for (const img of itm.images || []) {
            allImages.push({
              ...img,
              encounterId: enc.id,
              patientIdentifier: enc.patientIdentifier,
              bedNumber: enc.bedNumber,
            });
          }
        }
      }
    }
  }

  // Filter images
  const filteredImages = allImages.filter((img) => {
    const isAnonymized = (img.tags || []).some((t) => t === 'anonymized' || t === 'redacted');
    if (privacyFilter === 'anonymized' && !isAnonymized) return false;
    if (privacyFilter === 'needs_review' && isAnonymized) return false;

    if (selectedTag && !(img.tags || []).includes(selectedTag)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCaption = (img.caption || '').toLowerCase().includes(q);
      const matchPt = img.patientIdentifier.toLowerCase().includes(q);
      const matchTag = (img.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchCaption && !matchPt && !matchTag) return false;
    }
    return true;
  });

  // Collect all unique tags across images
  const allTags = Array.from(new Set(allImages.flatMap((img) => img.tags || [])));

  // Add tag to image
  const handleAddTag = (targetImg: MedicalImage & { encounterId: string }) => {
    if (!newTagText.trim()) return;
    const tagToAdd = newTagText.trim().toLowerCase().replace(/^#/, '');

    const targetEnc = encounters.find((e) => e.id === targetImg.encounterId);
    if (!targetEnc) return;

    const updatedEnc = JSON.parse(JSON.stringify(targetEnc)) as PatientEncounter;

    // Check encounter images
    let found = false;
    if (updatedEnc.images) {
      for (const img of updatedEnc.images) {
        if (img.id === targetImg.id) {
          img.tags = Array.from(new Set([...(img.tags || []), tagToAdd]));
          found = true;
          break;
        }
      }
    }

    // Check checklist item images if not found
    if (!found) {
      for (const chk of updatedEnc.checklists || []) {
        for (const sec of chk.sections || []) {
          for (const itm of sec.items || []) {
            for (const img of itm.images || []) {
              if (img.id === targetImg.id) {
                img.tags = Array.from(new Set([...(img.tags || []), tagToAdd]));
                found = true;
                break;
              }
            }
          }
        }
      }
    }

    onUpdateEncounter(updatedEnc);
    setNewTagText('');
    setTagInputImageId(null);
  };

  // Remove tag from image
  const handleRemoveTag = (targetImg: MedicalImage & { encounterId: string }, tagToRemove: string) => {
    const targetEnc = encounters.find((e) => e.id === targetImg.encounterId);
    if (!targetEnc) return;

    const updatedEnc = JSON.parse(JSON.stringify(targetEnc)) as PatientEncounter;

    if (updatedEnc.images) {
      for (const img of updatedEnc.images) {
        if (img.id === targetImg.id && img.tags) {
          img.tags = img.tags.filter((t) => t !== tagToRemove);
        }
      }
    }

    for (const chk of updatedEnc.checklists || []) {
      for (const sec of chk.sections || []) {
        for (const itm of sec.items || []) {
          for (const img of itm.images || []) {
            if (img.id === targetImg.id && img.tags) {
              img.tags = img.tags.filter((t) => t !== tagToRemove);
            }
          }
        }
      }
    }

    onUpdateEncounter(updatedEnc);
  };

  // Toggle Anonymized Status
  const handleToggleAnonymized = (targetImg: MedicalImage & { encounterId: string }) => {
    const hasTag = (targetImg.tags || []).includes('anonymized');
    if (hasTag) {
      handleRemoveTag(targetImg, 'anonymized');
    } else {
      const targetEnc = encounters.find((e) => e.id === targetImg.encounterId);
      if (!targetEnc) return;
      const updatedEnc = JSON.parse(JSON.stringify(targetEnc)) as PatientEncounter;

      let found = false;
      if (updatedEnc.images) {
        for (const img of updatedEnc.images) {
          if (img.id === targetImg.id) {
            img.tags = Array.from(new Set([...(img.tags || []), 'anonymized']));
            found = true;
            break;
          }
        }
      }
      if (!found) {
        for (const chk of updatedEnc.checklists || []) {
          for (const sec of chk.sections || []) {
            for (const itm of sec.items || []) {
              for (const img of itm.images || []) {
                if (img.id === targetImg.id) {
                  img.tags = Array.from(new Set([...(img.tags || []), 'anonymized']));
                  found = true;
                  break;
                }
              }
            }
          }
        }
      }
      onUpdateEncounter(updatedEnc);
    }
  };

  // Save Redacted / Edited Photo Result
  const handleSaveEditedImage = (
    targetImg: MedicalImage & { encounterId: string },
    dataUrl: string,
    asNewCopy: boolean
  ) => {
    const targetEnc = encounters.find((e) => e.id === targetImg.encounterId);
    if (!targetEnc) return;

    const updatedEnc = JSON.parse(JSON.stringify(targetEnc)) as PatientEncounter;

    if (asNewCopy) {
      const newImg: MedicalImage = {
        id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        url: dataUrl,
        caption: `[De-identified] ${targetImg.caption || 'Clinical Snapshot'}`,
        tags: Array.from(new Set([...(targetImg.tags || []), 'anonymized'])),
        timestamp: Date.now(),
      };
      updatedEnc.images = [...(updatedEnc.images || []), newImg];
    } else {
      let found = false;
      if (updatedEnc.images) {
        for (const img of updatedEnc.images) {
          if (img.id === targetImg.id) {
            img.url = dataUrl;
            img.tags = Array.from(new Set([...(img.tags || []), 'anonymized']));
            found = true;
            break;
          }
        }
      }
      if (!found) {
        for (const chk of updatedEnc.checklists || []) {
          for (const sec of chk.sections || []) {
            for (const itm of sec.items || []) {
              for (const img of itm.images || []) {
                if (img.id === targetImg.id) {
                  img.url = dataUrl;
                  img.tags = Array.from(new Set([...(img.tags || []), 'anonymized']));
                  found = true;
                  break;
                }
              }
            }
          }
        }
      }
    }

    updatedEnc.updatedAt = Date.now();
    onUpdateEncounter(updatedEnc);
    setEditingImage(null);
    if (activeLightbox && activeLightbox.id === targetImg.id) {
      setActiveLightbox(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Clinical Medical Image Gallery
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ECGs, rash progression, ultrasound scans, and wound snapshots tagged by diagnosis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Privacy & Anonymization Reminder Banner */}
        <div className="mx-6 mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs transition-colors">
          <div className="p-1.5 bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span>Patient Privacy & PHI De-identification Reminder</span>
              <span className="text-[10px] bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded font-mono">
                HIPAA Notice
              </span>
            </div>
            <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
              Medical photos, ECG strips, radiology scans, and lab reports often contain identifiable patient details in borders and headers. Before sharing case photos externally, use the <strong>Edit & Redact</strong> tool to black out all patient names, dates of birth, MRNs, and hospital barcodes.
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Patient dropdown filter */}
            <select
              value={filterPatientId}
              onChange={(e) => setFilterPatientId(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none w-full sm:w-auto"
            >
              <option value="all">All Patients & Wards</option>
              {encounters
                .filter((e) => !e.isDeleted)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.patientIdentifier} {e.bedNumber ? `(Bed ${e.bedNumber})` : ''}
                  </option>
                ))}
            </select>

            {/* Privacy Filter Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0">
              <button
                onClick={() => setPrivacyFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                  privacyFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({allImages.length})
              </button>

              <button
                onClick={() => setPrivacyFilter('anonymized')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  privacyFilter === 'anonymized'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Anonymized</span>
              </button>

              <button
                onClick={() => setPrivacyFilter('needs_review')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                  privacyFilter === 'needs_review'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Needs Review</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search images by caption, patient, or tag (#ecg, #wound)..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* Tags bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-indigo-500" />
              <span>Tags:</span>
            </span>

            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedTag === null
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              All Tags
            </button>

            {Array.from(new Set([...COMMON_IMAGE_TAGS, ...allTags])).map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="p-6 overflow-y-auto flex-1">
          {filteredImages.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                No Medical Images Found
              </p>
              <p className="text-xs">
                Attach images (ECGs, photos, scans) from the patient dossier view or bedside rounds.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredImages.map((img) => {
                const isAnonymized = (img.tags || []).some(
                  (t) => t === 'anonymized' || t === 'redacted'
                );

                return (
                  <div
                    key={img.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group min-w-0 max-w-full"
                  >
                    {/* Thumbnail */}
                    <div
                      onClick={() => setActiveLightbox(img)}
                      className="relative aspect-square bg-slate-950 cursor-pointer overflow-hidden"
                    >
                      <img
                        src={img.url}
                        alt={img.caption || 'Clinical snapshot'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />

                      {/* Anonymization Status Badge */}
                      <div className="absolute top-2 left-2 z-10 max-w-[85%]">
                        {isAnonymized ? (
                          <span className="text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-xs truncate">
                            <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">Anonymized</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-700/80 px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-xs truncate">
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">Needs Redaction</span>
                          </span>
                        )}
                      </div>

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingImage(img);
                          }}
                          className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white text-xs font-semibold flex items-center gap-1 shadow-md"
                          title="Open Photo Editor & Redaction Tool"
                        >
                          <EyeOff className="w-4 h-4" />
                          <span>Redact</span>
                        </button>

                        <div className="p-2 bg-slate-800/80 rounded-xl text-white">
                          <Maximize2 className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Info & Tags */}
                    <div className="p-3 space-y-2 flex-1 flex flex-col justify-between min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate min-w-0 flex-1">
                            {img.patientIdentifier}
                          </div>
                          {img.bedNumber && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1 rounded shrink-0">
                              Bed {img.bedNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate min-w-0 break-words mt-0.5">
                          {img.caption || 'Clinical Snapshot'}
                        </div>
                      </div>

                      {/* Action Bar on Card */}
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-750 flex items-center justify-between text-xs">
                        <button
                          onClick={() => setEditingImage(img)}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <EyeOff className="w-3 h-3" />
                          <span>Edit / Redact</span>
                        </button>

                        <button
                          onClick={() => handleToggleAnonymized(img)}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium border transition-colors ${
                            isAnonymized
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                          }`}
                          title="Toggle verified anonymized status"
                        >
                          {isAnonymized ? '✓ Verified' : 'Mark Safe'}
                        </button>
                      </div>

                      {/* Tags List */}
                      <div className="space-y-1.5 pt-1 min-w-0">
                        <div className="flex flex-wrap gap-1 min-w-0">
                          {(img.tags || []).map((tag) => (
                            <span
                              key={tag}
                              className={`text-[10px] px-1.5 py-0.2 rounded-md font-medium flex items-center gap-1 border max-w-full truncate ${
                                tag === 'anonymized' || tag === 'redacted'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40'
                                  : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/40'
                              }`}
                            >
                              <span className="truncate max-w-[120px]">#{tag}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveTag(img, tag);
                                }}
                                className="hover:text-red-500 shrink-0"
                              >
                                ×
                              </button>
                            </span>
                          ))}

                          {tagInputImageId === img.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={newTagText}
                                onChange={(e) => setNewTagText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddTag(img);
                                  else if (e.key === 'Escape') setTagInputImageId(null);
                                }}
                                placeholder="tag..."
                                autoFocus
                                className="text-[10px] px-1 py-0.5 border border-indigo-400 rounded w-16 bg-white dark:bg-slate-900 outline-none"
                              />
                              <button
                                onClick={() => handleAddTag(img)}
                                className="text-[10px] text-indigo-600 font-bold"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setTagInputImageId(img.id);
                                setNewTagText('');
                              }}
                              className="text-[10px] text-slate-400 hover:text-indigo-600 flex items-center gap-0.5 px-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tag</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lightbox Modal */}
        {activeLightbox && (
          <div
            onClick={() => setActiveLightbox(null)}
            className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center bg-slate-950 rounded-2xl p-4 border border-slate-800 overflow-y-auto"
            >
              <img
                src={activeLightbox.url}
                alt={activeLightbox.caption || 'Enlarged Image'}
                className="max-h-[70vh] max-w-full rounded-xl object-contain mb-3"
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full text-white text-xs gap-3 min-w-0">
                <div className="min-w-0 flex-1 break-words">
                  <div className="font-bold text-sm flex items-center gap-2 flex-wrap min-w-0">
                    <span className="break-words">{activeLightbox.caption || 'Clinical Snapshot'}</span>
                    {(activeLightbox.tags || []).includes('anonymized') ? (
                      <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-2 py-0.2 rounded-full font-mono flex items-center gap-1 border border-emerald-700 shrink-0">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Anonymized</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-900/80 text-amber-300 px-2 py-0.2 rounded-full font-mono flex items-center gap-1 border border-amber-700 shrink-0">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Unverified / Needs Review</span>
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-[11px] flex flex-wrap gap-1.5 mt-1 min-w-0">
                    {(activeLightbox.tags || []).map((t) => (
                      <span key={t} className="bg-slate-800 px-1.5 py-0.2 rounded text-[10px]">#{t}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingImage(activeLightbox);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold transition-colors flex items-center gap-1.5"
                    title="Open Redaction Photo Editor"
                  >
                    <EyeOff className="w-4 h-4" />
                    <span>Edit & Redact</span>
                  </button>

                  <a
                    href={activeLightbox.url}
                    download={`clinical_image_${activeLightbox.id}.png`}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors"
                    title="Download Image"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => setActiveLightbox(null)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Redaction & Editing Modal */}
        {editingImage && (
          <ImageEditorModal
            imageUrl={editingImage.url}
            imageCaption={editingImage.caption}
            onSave={(dataUrl, asNewCopy) => handleSaveEditedImage(editingImage, dataUrl, asNewCopy)}
            onClose={() => setEditingImage(null)}
          />
        )}
      </div>
    </div>
  );
};
