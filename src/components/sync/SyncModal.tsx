import React, { useState, useEffect } from 'react';
import { GitBranch, ShieldCheck, Wifi, RefreshCw, Key, Check, AlertTriangle, ArrowUpRight, ArrowDownLeft, X } from 'lucide-react';
import { GitHubSyncConfig, SyncStatus } from '../../types/sync';
import { GitHubSyncService } from '../../utils/githubSync';
import { P2PSyncService } from '../../utils/p2pSync';
import { db } from '../../db/db';

interface SyncModalProps {
  onClose: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'github' | 'p2p'>('github');
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
  const [p2pPayloadText, setP2pPayloadText] = useState('');
  const [p2pImportResult, setP2pImportResult] = useState<string | null>(null);

  // Load saved sync config
  useEffect(() => {
    db.settings.get('github_sync_config').then((entry) => {
      if (entry && entry.value) {
        setConfig(entry.value);
      }
    });
  }, []);

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
    log('Starting Git synchronization via GitHub REST API...');

    try {
      // 1. Sync templates
      const templates = await db.templates.filter((t) => !t.isDeleted).toArray();
      log(`Syncing ${templates.length} checklist templates...`);
      for (const tpl of templates) {
        const res = await service.syncTemplate(tpl);
        if (!res.success) {
          log(`⚠️ Failed to sync template: ${tpl.title} (${res.error})`);
        }
      }

      // 2. Sync patient encounters
      const encounters = await db.encounters.filter((e) => !e.isDeleted).toArray();
      log(`Syncing ${encounters.length} patient encounters...`);
      for (const enc of encounters) {
        const res = await service.syncEncounter(enc);
        if (!res.success) {
          log(`⚠️ Failed to sync encounter: ${enc.patientIdentifier} (${res.error})`);
        }
      }

      log('✅ GitHub sync complete! Commit history created in private repository.');
      await handleSaveConfig({ ...config, lastSyncedAt: Date.now() });
    } catch (err: any) {
      log(`❌ Sync error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleExportP2P = async () => {
    const payload = await P2PSyncService.exportSyncPayload();
    const str = JSON.stringify(payload, null, 2);
    setP2pPayloadText(str);
    try {
      await navigator.clipboard.writeText(str);
      setP2pImportResult('Payload copied to clipboard! Paste this on your other device.');
    } catch {}
  };

  const handleImportP2P = async () => {
    try {
      const parsed = JSON.parse(p2pPayloadText);
      const res = await P2PSyncService.importSyncPayload(parsed);
      setP2pImportResult(
        `Successfully merged: ${res.templatesUpdated} templates, ${res.encountersUpdated} encounters.`
      );
    } catch (err: any) {
      setP2pImportResult(`Error: Invalid JSON sync payload (${err.message})`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Sync & Version Control</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                GitHub Private Repo (PAT) & Local P2P Wi-Fi Sync
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-2 bg-white dark:bg-slate-900 transition-colors">
          <button
            onClick={() => setActiveTab('github')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'github'
                ? 'border-slate-900 dark:border-indigo-500 text-slate-900 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>GitHub Private Repo (PAT)</span>
          </button>
          <button
            onClick={() => setActiveTab('p2p')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'p2p'
                ? 'border-slate-900 dark:border-indigo-500 text-slate-900 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Wifi className="w-4 h-4" />
            <span>Local P2P / Direct Sync</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'github' ? (
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
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    Token requires `repo` scope to read and write to your private repository.
                  </p>
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
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500"
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
                    placeholder="med-checklist-data"
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch:</label>
                  <input
                    type="text"
                    value={config.branch}
                    onChange={(e) => handleSaveConfig({ ...config, branch: e.target.value })}
                    placeholder="main"
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-indigo-500"
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
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-slate-200">Hospital Wi-Fi / Offline Direct Transfer: </span>
                When internet or GitHub access is blocked at the bedside, use Local P2P data exchange to move checklists, templates, and encounters directly between your Android tablet and PC.
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportP2P}
                  className="flex-1 py-2.5 px-3 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Export & Copy Sync Package</span>
                </button>
                <button
                  onClick={handleImportP2P}
                  disabled={!p2pPayloadText.trim()}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Import & Merge Package</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  P2P Sync Payload JSON:
                </label>
                <textarea
                  rows={6}
                  value={p2pPayloadText}
                  onChange={(e) => setP2pPayloadText(e.target.value)}
                  placeholder="Paste sync package JSON here or click 'Export & Copy'..."
                  className="w-full font-mono text-[11px] p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {p2pImportResult && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs">
                  {p2pImportResult}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            {config.lastSyncedAt
              ? `Last synced: ${new Date(config.lastSyncedAt).toLocaleTimeString()}`
              : 'Never synced'}
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
                <span>{syncing ? 'Syncing...' : 'Sync to GitHub Now'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
