import React, { useState } from 'react';
import { Image as ImageIcon, Link as LinkIcon, Upload, X, Check, Globe, Video, BookOpen, FileText } from 'lucide-react';
import { MedicalImage, MedicalLink } from '../../types/checklist';

interface AttachModalProps {
  onAttachImage: (image: MedicalImage) => void;
  onAttachLink: (link: MedicalLink) => void;
  onClose: () => void;
}

export const AttachModal: React.FC<AttachModalProps> = ({
  onAttachImage,
  onAttachLink,
  onClose,
}) => {
  const [tab, setTab] = useState<'image' | 'link'>('image');
  const [imageCaption, setImageCaption] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkCategory, setLinkCategory] = useState<MedicalLink['category']>('uptodate');

  // Handle file select or drag
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle paste image from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const handleSaveImage = () => {
    if (!imagePreview) return;
    onAttachImage({
      id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      url: imagePreview,
      caption: imageCaption.trim() || undefined,
      timestamp: Date.now(),
    });
    onClose();
  };

  const handleSaveLink = () => {
    if (!linkTitle.trim() || !linkUrl.trim()) return;
    onAttachLink({
      id: 'link-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      title: linkTitle.trim(),
      url: linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`,
      category: linkCategory,
    });
    onClose();
  };

  const applyLinkPreset = (preset: 'uptodate' | 'pubmed' | 'wiki' | 'youtube') => {
    setLinkCategory(preset);
    if (preset === 'uptodate') {
      setLinkTitle('UpToDate Clinical Topic');
      setLinkUrl('https://www.uptodate.com/contents/');
    } else if (preset === 'pubmed') {
      setLinkTitle('PubMed Reference');
      setLinkUrl('https://pubmed.ncbi.nlm.nih.gov/');
    } else if (preset === 'wiki') {
      setLinkTitle('Wikipedia Medical Article');
      setLinkUrl('https://en.wikipedia.org/wiki/');
    } else if (preset === 'youtube') {
      setLinkTitle('Clinical Procedure / Video');
      setLinkUrl('https://www.youtube.com/watch?v=');
    }
  };

  return (
    <div
      onPaste={handlePaste}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              {tab === 'image' ? <ImageIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {tab === 'image' ? 'Attach Clinical Image / Snapshot' : 'Add Medical Reference Link'}
              </h2>
              <p className="text-xs text-slate-500">
                Capture ECGs, wound photos, or link to UpToDate, PubMed, Guidelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 px-6 pt-2 bg-white">
          <button
            onClick={() => setTab('image')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'image'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image / Photo</span>
          </button>
          <button
            onClick={() => setTab('link')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'link'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Reference Link</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {tab === 'image' ? (
            <div className="space-y-4">
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-60 flex items-center justify-center bg-slate-900">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-60 max-w-full object-contain"
                  />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-lg"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <div className="text-xs font-semibold text-slate-700">
                    Click to upload image or drag & drop
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Or paste directly from clipboard (Ctrl+V)
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Caption / Description:
                </label>
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="e.g. 12-Lead ECG showing V2-V4 ST elevation, Bedside ultrasound"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Quick Presets:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyLinkPreset('uptodate')}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      linkCategory === 'uptodate'
                        ? 'border-indigo-600 bg-indigo-50/40 font-semibold text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs">UpToDate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyLinkPreset('pubmed')}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      linkCategory === 'pubmed'
                        ? 'border-indigo-600 bg-indigo-50/40 font-semibold text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-xs">PubMed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyLinkPreset('wiki')}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      linkCategory === 'wiki'
                        ? 'border-indigo-600 bg-indigo-50/40 font-semibold text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Globe className="w-4 h-4 text-slate-700" />
                    <span className="text-xs">Wikipedia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyLinkPreset('youtube')}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                      linkCategory === 'youtube'
                        ? 'border-indigo-600 bg-indigo-50/40 font-semibold text-indigo-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Video className="w-4 h-4 text-rose-600" />
                    <span className="text-xs">YouTube / Video</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link Title:
                </label>
                <input
                  type="text"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="e.g. UpToDate: Initial Evaluation of Acute Coronary Syndrome"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL:</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={tab === 'image' ? handleSaveImage : handleSaveLink}
            disabled={tab === 'image' ? !imagePreview : !linkTitle.trim() || !linkUrl.trim()}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{tab === 'image' ? 'Attach Image' : 'Add Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
