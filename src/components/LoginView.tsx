import React from 'react';
import { ShieldCheck, LogIn, AlertTriangle, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseConfig } from '../services/firebase';

export const LoginView: React.FC = () => {
  const { signInWithGoogle, isSigningIn, authError } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-6">
        <div className="flex items-center space-x-3">
          <img
            src="https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/StaffAttend/android-chrome-192x192.png"
            alt="StaffAttend Logo"
            className="w-11 h-11 rounded-2xl object-contain shadow-md"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              <span className="text-white">STAFF</span>
              <span className="text-blue-400">ATTEND</span>
            </h1>
            <p className="text-xs text-slate-400">Platform Kehadiran Multi-Institusi (SES v4.4)</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2 text-xs text-slate-300">
          <div className="flex items-center space-x-2 text-indigo-300 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>Pengesahan Rasmi Google Authentication</span>
          </div>
          <p className="leading-relaxed text-slate-300/90">
            Log masuk menggunakan akaun Google yang telah didaftarkan. Akses data dikawal mengikut keahlian dan peranan institusi anda pada pelayan Firestore.
          </p>
        </div>

        {authError && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        <button
          onClick={signInWithGoogle}
          disabled={isSigningIn}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm py-3 px-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2.5 cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>{isSigningIn ? 'Sedang Mengesahkan...' : 'Log Masuk dengan Google'}</span>
        </button>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>Default Deny + Tenant Isolated</span>
          </span>
          <span className="font-mono">{firebaseConfig.projectId}</span>
        </div>
      </div>
    </div>
  );
};
