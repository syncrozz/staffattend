import React, { useState, useEffect } from 'react';
import { QrCode, Volume2, VolumeX, Radio, ShieldCheck, Cloud, Download, LogOut, Building2 } from 'lucide-react';
import { EventItem, InstitutionRole } from '../types';
import { soundService } from '../services/soundService';

interface InstitutionOption {
  id: string;
  name: string;
  code: string;
}

interface HeaderProps {
  activeEvent: EventItem | null;
  soundEnabled: boolean;
  userEmail: string;
  isPlatformOwner: boolean;
  effectiveRole: InstitutionRole | null;
  activeInstitutionId: string | null;
  institutions: InstitutionOption[];
  canScan: boolean;
  onSelectInstitution: (id: string) => void;
  onToggleSound: (enabled: boolean) => void;
  onOpenScanner: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeEvent,
  soundEnabled,
  userEmail,
  isPlatformOwner,
  effectiveRole,
  activeInstitutionId,
  institutions,
  canScan,
  onSelectInstitution,
  onToggleSound,
  onOpenScanner,
  onSignOut
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <header id="main-app-header" className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 sm:gap-3">
        {/* Row 1: Brand identity + Auth & Institution Switcher */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <img
              src="https://raw.githubusercontent.com/syncrozz/syncrozz-assets/main/logo/StaffAttend/android-chrome-192x192.png"
              alt="StaffAttend Official Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-xl shadow-md flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center space-x-1.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight font-sans leading-tight">
                  <span className="text-white">STAFF</span>
                  <span className="text-blue-400">ATTEND</span>
                </h1>
                <span className="inline-flex items-center space-x-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-sans font-medium">
                  <Cloud className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400" />
                  <span>Cloud Synced</span>
                </span>
                {deferredPrompt && (
                  <button
                    onClick={handleInstallClick}
                    className="inline-flex items-center space-x-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-sans font-semibold transition-all cursor-pointer animate-pulse"
                    title="Pasang aplikasi ini ke peranti anda (PWA)"
                  >
                    <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-indigo-400" />
                    <span>Pasang App</span>
                  </button>
                )}
                {isInstalled && (
                  <span className="hidden md:inline-flex items-center space-x-1 bg-blue-500/10 text-blue-300 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded-full font-sans font-medium">
                    <span>PWA Active</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 hidden xs:block truncate">
                {userEmail}
                {isPlatformOwner ? ' • PLATFORM_OWNER' : ''}
                {effectiveRole ? ` • ${effectiveRole}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {isPlatformOwner && (
              <span className="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>OWNER</span>
              </span>
            )}
            <button
              id="header-signout-btn"
              onClick={onSignOut}
              className="px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1 cursor-pointer"
              title="Log keluar daripada akaun Google"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Keluar</span>
            </button>
          </div>
        </div>

        {/* Row 2: Institution Switcher + Active Event Banner + Action Controls */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          {institutions.length > 0 && (
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-[11px] sm:text-xs flex-shrink-0">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 mr-1.5 flex-shrink-0" />
              <select
                value={activeInstitutionId || ''}
                onChange={(e) => onSelectInstitution(e.target.value)}
                className="bg-slate-800 text-white font-semibold focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.code} — {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Event Status Badge */}
          {activeEvent ? (
            <div className="flex items-center bg-emerald-950/80 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 text-[11px] sm:text-xs text-emerald-200 flex-1 min-w-0">
              <span className="relative flex h-2 w-2 mr-1.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-semibold mr-1 flex-shrink-0 hidden xs:inline">EVENT:</span>
              <span className="font-medium truncate text-white" title={activeEvent.name}>
                {activeEvent.name}
              </span>
            </div>
          ) : (
            <div className="flex items-center bg-amber-950/60 border border-amber-500/30 rounded-xl px-2.5 py-1.5 text-[11px] sm:text-xs text-amber-300 flex-1 min-w-0">
              <Radio className="w-3 h-3 mr-1 text-amber-400 animate-pulse flex-shrink-0" />
              <span className="truncate">TIADA EVENT AKTIF</span>
            </div>
          )}

          {/* Quick Controls */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            {canScan && (
              <button
                id="header-quick-scanner-btn"
                onClick={onOpenScanner}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 rounded-xl transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Pengimbas</span>
              </button>
            )}

            <button
              id="header-sound-toggle-btn"
              onClick={() => {
                const next = !soundEnabled;
                soundService.setEnabled(next);
                onToggleSound(next);
              }}
              title={soundEnabled ? 'Matikan Bunyi Feedback' : 'Hidupkan Bunyi Feedback'}
              className={`p-1.5 sm:p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
