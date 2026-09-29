import React, { useState } from 'react';
import { ShieldCheck, Lock, Unlock, Key, Check, AlertCircle, X, ShieldAlert } from 'lucide-react';
import { cryptoVault } from '../../utils/cryptoVault';

interface VaultModalProps {
  onClose: () => void;
  onVaultStateChanged: () => void;
}

export const VaultModal: React.FC<VaultModalProps> = ({ onClose, onVaultStateChanged }) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasPassphrase = cryptoVault.hasUserPassphrase();
  const isLocked = cryptoVault.isVaultLocked();

  const handleSetPassphrase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passphrase.length < 6) {
      setError('Master passphrase must be at least 6 characters long.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match.');
      return;
    }

    const ok = await cryptoVault.setMasterPassphrase(passphrase);
    if (ok) {
      setSuccess('Master passphrase successfully set! Your vault is protected.');
      setPassphrase('');
      setConfirmPassphrase('');
      onVaultStateChanged();
    } else {
      setError('Failed to configure passphrase.');
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const ok = await cryptoVault.unlockVault(passphrase);
    if (ok) {
      setSuccess('Vault unlocked successfully.');
      setPassphrase('');
      onVaultStateChanged();
      setTimeout(onClose, 800);
    } else {
      setError('Incorrect master passphrase. Decryption failed.');
    }
  };

  const handleLock = () => {
    cryptoVault.lockVault();
    onVaultStateChanged();
    setSuccess('Vault locked.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden flex flex-col transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Security & Encryption at Rest
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hardware-backed AES-256-GCM + PBKDF2
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

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="font-semibold">Encryption at Rest Active</div>
              <p className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-300">
                All patient identifiers, clinical notes, and handwritten stylus strokes are encrypted at rest on this device using client-side AES-256-GCM.
              </p>
            </div>
          </div>

          {isLocked ? (
            /* Unlock Form */
            <form onSubmit={handleUnlock} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Lock className="w-4 h-4" />
                <span>Vault is Currently Locked</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enter Master Passphrase to Unlock:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter passphrase..."
                    className="w-full text-xs px-3 py-2 pl-8 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Vault</span>
              </button>
            </form>
          ) : (
            /* Passphrase Setup or Lock */
            <div className="space-y-4">
              {hasPassphrase ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div>
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Master Passphrase Protection
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Vault is unlocked for current session.
                      </div>
                    </div>
                    <button
                      onClick={handleLock}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Lock Now</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSetPassphrase} className="space-y-3">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    You can set an optional <strong>Master Passphrase</strong> to require password entry before opening patient files:
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Master Passphrase:
                    </label>
                    <input
                      type="password"
                      required
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Minimum 6 characters..."
                      className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm Passphrase:
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPassphrase}
                      onChange={(e) => setConfirmPassphrase(e.target.value)}
                      placeholder="Re-type passphrase..."
                      className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                  >
                    Enable Master Passphrase Lock
                  </button>
                </form>
              )}
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
