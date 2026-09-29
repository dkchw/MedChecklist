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
} from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLightbox, setActiveLightbox] = useState<MedicalImage | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden transition-colors">
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

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Patient dropdown filter */}
            <select
              value={filterPatientId}
              onChange={(e) => setFilterPatientId(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 outline-none w-full sm:w-auto"
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

            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search images by caption, patient, or tag (#ecg, #wound)..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 outline-none"
              />
            </div>
          </div>

          {/* Tags bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>Tags:</span>
            </span>

            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedTag === null
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              All ({allImages.length})
            </button>

            {Array.from(new Set([...COMMON_IMAGE_TAGS, ...allTags])).map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredImages.map((img) => (
                <div
                  key={img.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => setActiveLightbox(img)}
                    className="relative aspect-square bg-slate-900 cursor-pointer overflow-hidden"
                  >
                    <img
                      src={img.url}
                      alt={img.caption || 'Clinical snapshot'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Info & Tags */}
                  <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {img.patientIdentifier}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {img.caption || 'Clinical Snapshot'}
                      </div>
                    </div>

                    {/* Tags List */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap gap-1">
                        {(img.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-md font-medium flex items-center gap-1 border border-indigo-100 dark:border-indigo-900/40"
                          >
                            <span>#{tag}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTag(img, tag);
                              }}
                              className="hover:text-red-500"
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
              ))}
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
              className="relative max-w-4xl max-h-[92vh] flex flex-col items-center bg-slate-950 rounded-2xl p-4 border border-slate-800"
            >
              <img
                src={activeLightbox.url}
                alt={activeLightbox.caption || 'Enlarged Image'}
                className="max-h-[75vh] max-w-full rounded-xl object-contain mb-3"
              />
              <div className="flex items-center justify-between w-full text-white text-xs">
                <div>
                  <div className="font-bold text-sm">{activeLightbox.caption || 'Clinical Snapshot'}</div>
                  <div className="text-slate-400 text-[11px] flex gap-2">
                    {(activeLightbox.tags || []).map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
};
