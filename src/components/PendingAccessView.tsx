import React, { useState } from 'react';
import { Clock, Copy, Check, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const PendingAccessView: React.FC = () => {
  const { user, signOutUser } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyUid = () => {
    if (!user?.uid) return;
    navigator.clipboard?.writeText(user.uid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-5">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Menunggu Penugasan Institusi</h2>
            <p className="text-xs text-slate-400">Log masuk Google berjaya, namun akaun anda belum didaftarkan ke mana-mana institusi.</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Emel Google Disahkan:</span>
            <span className="text-white font-semibold">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <span className="text-slate-400">Firebase UID Anda:</span>
            <div className="flex items-center space-x-1.5">
              <code className="text-indigo-300 font-mono bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded">
                {user?.uid}
              </code>
              <button
                onClick={handleCopyUid}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 cursor-pointer"
                title="Salin UID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-start space-x-2">
          <ShieldAlert className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Log masuk Google tidak memberikan akses pentadbir secara automatik. Sila serahkan <strong>Emel</strong> dan <strong>Firebase UID</strong> di atas kepada Pentadbir Institusi atau Platform Owner untuk penugasan peranan.
          </p>
        </div>

        <button
          onClick={signOutUser}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-700 flex items-center justify-center space-x-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Keluar</span>
        </button>
      </div>
    </div>
  );
};
