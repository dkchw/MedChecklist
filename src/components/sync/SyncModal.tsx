import React, { useState, useEffect, useRef } from 'react';
import {
  GitBranch,
  ShieldCheck,
  Wifi,
  RefreshCw,
  Key,
  Check,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  QrCode,
  Camera,
  Smartphone,
  Upload,
  Lock,
  Trash2,
  Copy,
} from 'lucide-react';
import { GitHubSyncConfig } from '../../types/sync';
import { SavedDevice, DeviceIdentity, DevicePairingPayload } from '../../types/security';
import { GitHubSyncService } from '../../utils/githubSync';
import { P2PSyncService } from '../../utils/p2pSync';
import { E2EEP2PService } from '../../utils/e2eeP2P';
import { db } from '../../db/db';

interface SyncModalProps {
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'github' | 'p2p'>('p2p');
  const [p2pSubTab, setP2pSubTab] = useState<'transfer' | 'qr_pair' | 'devices'>('transfer');

  // GitHub Sync State
  const [config, setConfig] = useState<GitHubSyncConfig>({
    personalAccessToken: '',
    repoOwner: '',
    repoName: 'med-checklist-data',
    branch: 'main',
    autoSyncIntervalMinutes: 0,
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  // P2P Identity & Saved Devices State
  const [myDevice, setMyDevice] = useState<DeviceIdentity | null>(null);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [myQrUrl, setMyQrUrl] = useState<string>('');
  const [savedDevices, setSavedDevices] = useState<SavedDevice[]>([]);
  const [selectedTargetDeviceId, setSelectedTargetDeviceId] = useState<string>('');

  // Pairing Input State
  const [manualPairingCode, setManualPairingCode] = useState('');
  const [pairingStatus, setPairingStatus] = useState<string | null>(null);

  // E2EE Transfer State
  const [e2eePayloadText, setE2eePayloadText] = useState('');
  const [transferStatus, setTransferStatus] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<boolean | null>(null);

  // Camera QR Scanner State
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Load initial data
  useEffect(() => {
    // 1. GitHub Config
    db.settings.get('github_sync_config').then((entry) => {
      if (entry && entry.value) {
        setConfig(entry.value);
      }
    });

    // 2. Device Identity & QR
    const dev = E2EEP2PService.getOrCreateLocalDevice();
    setMyDevice(dev);
    setDeviceNameInput(dev.deviceName);
    E2EEP2PService.generatePairingQRDataUrl().then(setMyQrUrl);

    // 3. Saved Devices
    loadSavedDevices();
  }, []);

  const loadSavedDevices = async () => {
    const list = await E2EEP2PService.getSavedDevices();
    setSavedDevices(list);
    if (list.length > 0 && !selectedTargetDeviceId) {
      setSelectedTargetDeviceId(list[0].id);
    }
  };

  // Camera QR Scanner Loop
  useEffect(() => {
    if (!isScanningCamera) {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      return;
    }

    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();

          scanIntervalRef.current = setInterval(() => {
            if (!videoRef.current || !canvasRef.current) return;
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const decoded = E2EEP2PService.decodeQrFromImageData(imageData);
              if (decoded) {
                handleProcessPairingString(decoded);
                setIsScanningCamera(false);
              }
            }
          }, 300);
        }
      })
      .catch((err) => {
        setPairingStatus(`Camera error: ${err.message}. Try pasting code or uploading QR image.`);
        setIsScanningCamera(false);
      });

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isScanningCamera]);

  const handleUpdateDeviceName = () => {
    if (!deviceNameInput.trim()) return;
    const updated = E2EEP2PService.updateLocalDeviceName(deviceNameInput.trim());
    setMyDevice(updated);
    E2EEP2PService.generatePairingQRDataUrl().then(setMyQrUrl);
  };

  const handleProcessPairingString = async (raw: string) => {
    setPairingStatus(null);
    const parsed = E2EEP2PService.parsePairingPayload(raw);
    if (!parsed) {
      setPairingStatus('Invalid QR code or pairing payload string.');
      return;
    }
    try {
      const saved = await E2EEP2PService.saveConnectedDevice(parsed);
      await loadSavedDevices();
      setSelectedTargetDeviceId(saved.id);
      setPairingStatus(`Successfully paired with: ${saved.name}!`);
      setManualPairingCode('');
    } catch (err: any) {
      setPairingStatus(`Pairing error: ${err.message}`);
    }
  };

  const handleQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const decoded = await E2EEP2PService.decodeQrFromImageFile(file);
    if (decoded) {
      handleProcessPairingString(decoded);
    } else {
      setPairingStatus('Could not locate QR code in this image.');
    }
  };

  const handleRemoveDevice = async (id: string) => {
    await E2EEP2PService.removeSavedDevice(id);
    await loadSavedDevices();
    if (selectedTargetDeviceId === id) {
      setSelectedTargetDeviceId('');
    }
  };

  // E2EE Export
  const handleExportE2EE = async () => {
    setTransferStatus(null);
    const target = savedDevices.find((d) => d.id === selectedTargetDeviceId);
    if (!target) {
      setTransferStatus('Please select or pair a target device first.');
      setTransferSuccess(false);
      return;
    }

    try {
      const payload = await P2PSyncService.exportSyncPayload();
      const encrypted = await E2EEP2PService.encryptE2EEPayload(payload, target);
      const str = JSON.stringify(encrypted, null, 2);
      setE2eePayloadText(str);

      await navigator.clipboard.writeText(str);
      setTransferStatus(
        `Payload encrypted with AES-256-GCM for "${target.name}" and copied to clipboard!`
      );
      setTransferSuccess(true);
    } catch (err: any) {
      setTransferStatus(`Encryption failed: ${err.message}`);
      setTransferSuccess(false);
    }
  };

  // E2EE Import
  const handleImportE2EE = async () => {
    setTransferStatus(null);
    if (!e2eePayloadText.trim()) {
      setTransferStatus('Paste encrypted package JSON first.');
      setTransferSuccess(false);
      return;
    }

    try {
      const parsed = JSON.parse(e2eePayloadText.trim());
      const { data, senderDeviceName } = await E2EEP2PService.decryptE2EEPayload(parsed);
      const res = await P2PSyncService.importSyncPayload(data);

      setTransferStatus(
        `Decrypted & synced from "${senderDeviceName}": ${res.encountersUpdated} encounters, ${res.checklistsUpdated} checklists, ${res.clinicalTemplatesUpdated} templates merged.`
      );
      setTransferSuccess(true);
      await loadSavedDevices();
    } catch (err: any) {
      setTransferStatus(`Import failed: ${err.message}`);
      setTransferSuccess(false);
    }
  };

  // GitHub Handlers
  const handleSaveConfig = async (newCfg: GitHubSyncConfig) => {
    setConfig(newCfg);
    await db.settings.put({ key: 'github_sync_config', value: newCfg });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const service = new GitHubSyncService(config);
    const res = await service.testConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handleSyncToGitHub = async () => {
    setSyncing(true);
    setSyncLog([]);
    const service = new GitHubSyncService(config);
    const log = (msg: string) => setSyncLog((prev) => [...prev, msg]);
    log('Starting Git sync via GitHub API...');

    try {
      const checklists = await db.checklists.filter((c) => !c.isDeleted).toArray();
      log(`Syncing ${checklists.length} modular checklists...`);
      for (const chk of checklists) {
        await service.syncTemplate(chk as any);
      }

      const encounters = await db.encounters.filter((e) => !e.isDeleted).toArray();
      log(`Syncing ${encounters.length} patient encounters...`);
      for (const enc of encounters) {
        await service.syncEncounter(enc);
      }

      log('✅ GitHub sync complete! Markdown files committed to private repo.');
      await handleSaveConfig({ ...config, lastSyncedAt: Date.now() });
    } catch (err: any) {
      log(`❌ Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl shadow-xs">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                P2P E2EE Sync & GitHub Version Control
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Offline direct encrypted transfer with QR pairing & GitHub PAT sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('p2p')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'p2p'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>P2P E2EE & QR Connect</span>
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'github'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>GitHub Private Repo (PAT)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-slate-900 dark:text-slate-100">
          {activeTab === 'p2p' ? (
            <div className="space-y-4">
              {/* Device Identity Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>This Device:</span>
                      <input
                        type="text"
                        value={deviceNameInput}
                        onChange={(e) => setDeviceNameInput(e.target.value)}
                        onBlur={handleUpdateDeviceName}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateDeviceName()}
                        className="text-xs font-semibold px-2 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 outline-none"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ID: {myDevice?.deviceId}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setP2pSubTab('transfer')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      p2pSubTab === 'transfer'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Transfer
                  </button>
                  <button
                    onClick={() => setP2pSubTab('qr_pair')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                      p2pSubTab === 'qr_pair'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <QrCode className="w-3 h-3" />
                    <span>Pair (QR)</span>
                  </button>
                  <button
                    onClick={() => setP2pSubTab('devices')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                      p2pSubTab === 'devices'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Saved ({savedDevices.length})
                  </button>
                </div>
              </div>

              {/* P2P Sub Tab 1: Direct Transfer */}
              {p2pSubTab === 'transfer' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-3 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">End-to-End Encrypted (AES-256-GCM): </span>
                      Data is encrypted client-side using paired device secrets. Unpaired devices or hospital Wi-Fi networks cannot read or tamper with patient dossiers.
                    </div>
                  </div>

                  {/* Target Device Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Paired Device:
                    </label>
                    {savedDevices.length === 0 ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
                        <span>No paired devices saved yet.</span>
                        <button
                          onClick={() => setP2pSubTab('qr_pair')}
                          className="font-bold underline ml-2"
                        >
                          Pair via QR Code →
                        </button>
                      </div>
                    ) : (
                      <select
                        value={selectedTargetDeviceId}
                        onChange={(e) => setSelectedTargetDeviceId(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none"
                      >
                        {savedDevices.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.lastSyncAt ? `(Synced: ${new Date(d.lastSyncAt).toLocaleDateString()})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Transfer Action Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportE2EE}
                      disabled={savedDevices.length === 0}
                      className="flex-1 py-2.5 px-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Export Encrypted Package</span>
                    </button>
                    <button
                      onClick={handleImportE2EE}
                      disabled={!e2eePayloadText.trim()}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ArrowDownLeft className="w-4 h-4" />
                      <span>Decrypt & Merge Package</span>
                    </button>
                  </div>

                  {/* Encrypted JSON Payload box */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        E2EE Encrypted Payload (Ciphertext):
                      </label>
                      {e2eePayloadText && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(e2eePayloadText);
                            setTransferStatus('Copied to clipboard!');
                            setTransferSuccess(true);
                          }}
                          className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Payload</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={5}
                      value={e2eePayloadText}
                      onChange={(e) => setE2eePayloadText(e.target.value)}
                      placeholder="Paste incoming encrypted payload here, or export above..."
                      className="w-full font-mono text-[11px] p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-900 text-slate-100 outline-none resize-none"
                    />
                  </div>

                  {transferStatus && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        transferSuccess
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                      }`}
                    >
                      {transferSuccess ? (
                        <Check className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{transferStatus}</span>
                    </div>
                  )}
                </div>
              )}

              {/* P2P Sub Tab 2: Pair via QR Code */}
              {p2pSubTab === 'qr_pair' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: My Device QR */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center text-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                        My Pairing QR Code
                      </h3>
                      {myQrUrl ? (
                        <img
                          src={myQrUrl}
                          alt="Pairing QR"
                          className="w-48 h-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white preserve-white p-2 shadow-2xs mb-2"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                          Generating QR...
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                        Scan this with your Android tablet or other PC to pair instantly.
                      </p>
                      <button
                        onClick={() => {
                          const code = E2EEP2PService.getPairingCode();
                          navigator.clipboard.writeText(code);
                          setPairingStatus('Pairing code copied to clipboard!');
                        }}
                        className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Pairing String</span>
                      </button>
                    </div>

                    {/* Right: Connect / Scan Partner */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                          Connect Partner Device
                        </h3>

                        {/* Camera Scanner View */}
                        {isScanningCamera ? (
                          <div className="relative rounded-xl overflow-hidden bg-black mb-3 aspect-video flex items-center justify-center">
                            <video ref={videoRef} className="w-full h-full object-cover" />
                            <canvas ref={canvasRef} className="hidden" />
                            <button
                              onClick={() => setIsScanningCamera(false)}
                              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-2 text-white text-[11px] bg-black/60 px-2 py-0.5 rounded">
                              Point camera at partner QR
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mb-3">
                            <button
                              onClick={() => setIsScanningCamera(true)}
                              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Scan with Camera</span>
                            </button>
                            <label className="flex-1 py-2 px-3 bg-white dark:bg-slate-700 hover:bg-slate-100 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              <span>Upload QR Image</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleQrFileUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Or Paste Pairing Code:
                          </label>
                          <textarea
                            rows={3}
                            value={manualPairingCode}
                            onChange={(e) => setManualPairingCode(e.target.value)}
                            placeholder='{"protocol":"medchecklist-e2ee", ...}'
                            className="w-full text-xs font-mono p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 outline-none resize-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleProcessPairingString(manualPairingCode)}
                        disabled={!manualPairingCode.trim()}
                        className="w-full py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-40 transition-colors"
                      >
                        Pair Device
                      </button>
                    </div>
                  </div>

                  {pairingStatus && (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-300 rounded-xl text-xs flex items-center gap-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{pairingStatus}</span>
                    </div>
                  )}
                </div>
              )}

              {/* P2P Sub Tab 3: Saved Connected Devices */}
              {p2pSubTab === 'devices' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Saved Trusted Devices ({savedDevices.length})
                    </h3>
                    <button
                      onClick={() => setP2pSubTab('qr_pair')}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Pair New Device</span>
                    </button>
                  </div>

                  {savedDevices.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                      No saved devices. Use the QR Code tab to pair your tablet and PC!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedDevices.map((dev) => (
                        <div
                          key={dev.id}
                          className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                              <Smartphone className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <span>{dev.name}</span>
                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-medium">
                                  Trusted
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-3">
                                <span>Paired: {new Date(dev.pairedAt).toLocaleDateString()}</span>
                                {dev.lastSyncAt && (
                                  <span>Last sync: {new Date(dev.lastSyncAt).toLocaleTimeString()}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveDevice(dev.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                            title="Remove Device"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* GitHub Tab */
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Version Control & Accidental Delete Protection
                  </div>
                  <div>
                    Checklists, templates, and encounters are committed to your GitHub private repository as pure Markdown files. Every change creates a Git commit history, allowing full rollback and preventing accidental data loss across Android and PC.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Personal Access Token (PAT):
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={config.personalAccessToken}
                      onChange={(e) =>
                        handleSaveConfig({ ...config, personalAccessToken: e.target.value })
                      }
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx or github_pat_..."
                      className="w-full text-xs font-mono px-3 py-2 pl-8 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500"
                    />
                    <Key className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Repo Owner (Username/Org):
                  </label>
                  <input
                    type="text"
                    value={config.repoOwner}
                    onChange={(e) => handleSaveConfig({ ...config, repoOwner: e.target.value })}
                    placeholder="e.g. dkchw"
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Repository Name:
                  </label>
                  <input
                    type="text"
                    value={config.repoName}
                    onChange={(e) => handleSaveConfig({ ...config, repoName: e.target.value })}
                    placeholder="MedChecklist"
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Branch:
                  </label>
                  <input
                    type="text"
                    value={config.branch}
                    onChange={(e) => handleSaveConfig({ ...config, branch: e.target.value })}
                    placeholder="main"
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={handleTestConnection}
                    disabled={testing || !config.personalAccessToken || !config.repoOwner}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 border border-slate-200/50 dark:border-slate-700"
                  >
                    {testing ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {syncLog.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 text-slate-200 p-3 rounded-xl text-[11px] font-mono space-y-1 max-h-36 overflow-y-auto">
                  {syncLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            {config.lastSyncedAt
              ? `GitHub last synced: ${new Date(config.lastSyncedAt).toLocaleTimeString()}`
              : 'E2EE Ready'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Close
            </button>
            {activeTab === 'github' && (
              <button
                onClick={handleSyncToGitHub}
                disabled={syncing || !config.personalAccessToken}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync to GitHub'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
