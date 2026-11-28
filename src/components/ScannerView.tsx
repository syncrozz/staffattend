import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Volume2,
  VolumeX,
  RefreshCw,
  Lock
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { EventItem, Staff, ScanResult, ScanMethod } from '../types';
import { buildStaffImageUrl, DEFAULT_AVATAR_FALLBACK, formatDisplayName } from '../utils/staffUtils';

interface ScannerViewProps {
  activeEvent: EventItem | null;
  staffList: Staff[];
  isInstitutionAdmin: boolean;
  canScan: boolean;
  allowManualOverride: boolean;
  qrPrefix?: string;
  avatarBaseUrl?: string;
  onProcessScan: (qrString: string, method: ScanMethod) => Promise<ScanResult>;
  onGoToEvents: () => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  activeEvent,
  staffList,
  isInstitutionAdmin,
  canScan,
  allowManualOverride,
  qrPrefix = 'STAFF',
  avatarBaseUrl,
  onProcessScan,
  onGoToEvents,
  soundEnabled,
  onToggleSound
}) => {
  const [scanMode, setScanMode] = useState<'SIMULATOR' | 'CAMERA'>('CAMERA');
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pauseCountdown, setPauseCountdown] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = 'html5qr-code-full-region';

  const canUseSimulator = isInstitutionAdmin && allowManualOverride;

  useEffect(() => {
    if (!canUseSimulator && scanMode === 'SIMULATOR') {
      setScanMode('CAMERA');
    }
  }, [canUseSimulator, scanMode]);

  const handleExecuteScan = async (rawQr: string, method: ScanMethod) => {
    if (isPaused || isSubmitting || !canScan) return;

    setIsSubmitting(true);
    setIsPaused(true);
    setPauseCountdown(2);

    try {
      const result = await onProcessScan(rawQr, method);
      setScanResult(result);
    } finally {
      setIsSubmitting(false);
    }

    const interval = setInterval(() => {
      setPauseCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsPaused(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      if (scanMode !== 'CAMERA' || !canScan) {
        return;
      }

      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current.clear();
        } catch (_) {}
        html5QrCodeRef.current = null;
      }

      const container = document.getElementById(qrRegionId);
      if (container) {
        container.innerHTML = '';
      }

      if (!isMounted) return;

      try {
        const html5QrCode = new Html5Qrcode(qrRegionId);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            if (isMounted) {
              handleExecuteScan(decodedText, 'CAMERA_SCAN');
            }
          },
          () => {}
        );

        if (!isMounted) {
          if (html5QrCode.isScanning) {
            await html5QrCode.stop();
            try {
              html5QrCode.clear();
            } catch (_) {}
          }
          const el = document.getElementById(qrRegionId);
          if (el) el.innerHTML = '';
        } else {
          setCameraError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Camera start error', err);
          setCameraError('Kamera tidak dapat diakses atau kebenaran ditolak.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current) {
        const scanner = html5QrCodeRef.current;
        html5QrCodeRef.current = null;

        const cleanup = async () => {
          try {
            if (scanner.isScanning) {
              await scanner.stop();
            }
            scanner.clear();
          } catch (_) {}
          const el = document.getElementById(qrRegionId);
          if (el) el.innerHTML = '';
        };
        cleanup();
      } else {
        const el = document.getElementById(qrRegionId);
        if (el) el.innerHTML = '';
      }
    };
  }, [scanMode, canScan]);

  if (!canScan) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-xs text-rose-200 flex items-center space-x-2">
        <Lock className="w-4 h-4 text-rose-400" />
        <span>Peranan anda (`VIEWER`) tidak mempunyai kebenaran merekod imbasan kehadiran.</span>
      </div>
    );
  }

  return (
    <div id="scanner-view-container" className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Pengimbas QR Kehadiran
              </span>
              <span className="text-slate-400 text-xs">Server-Confirmed Transaction</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Pengimbas Identiti Staf (Staff QR Scanner)
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleSound(!soundEnabled)}
              className={`p-2 rounded-xl border text-xs font-medium flex items-center space-x-1.5 cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 border-slate-700 text-emerald-400'
                  : 'bg-slate-800/50 border-slate-800 text-slate-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Bunyi Aktif' : 'Bunyi Bisu'}</span>
            </button>
          </div>
        </div>

        {activeEvent ? (
          <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <span className="text-emerald-400 font-bold uppercase tracking-wider">KONTEKS EVENT AKTIF: </span>
                <span className="text-white font-semibold">{activeEvent.name}</span>
                <span className="text-slate-400 ml-2 font-mono">({activeEvent.category} • {activeEvent.location})</span>
              </div>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded text-[11px] font-bold">
              OPEN
            </span>
          </div>
        ) : (
          <div className="bg-rose-950/50 border border-rose-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>TIADA EVENT AKTIF (OPEN). Sila buka sekurang-kurangnya 1 event di Pengurusan Event.</span>
            </div>
            <button
              onClick={onGoToEvents}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs"
            >
              Lihat Event
            </button>
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700 max-w-md mx-auto">
          {canUseSimulator ? (
            <button
              id="scanner-mode-sim-btn"
              onClick={() => setScanMode('SIMULATOR')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                scanMode === 'SIMULATOR'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Simulasi & Carian Kad</span>
            </button>
          ) : (
            <div className="flex-1 py-2 text-xs font-semibold rounded-lg text-slate-500 flex items-center justify-center space-x-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Simulasi (Admin Sahaja)</span>
            </div>
          )}

          <button
            id="scanner-mode-camera-btn"
            onClick={() => setScanMode('CAMERA')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              scanMode === 'CAMERA'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Kamera Live QR</span>
          </button>
        </div>

        {scanMode === 'CAMERA' && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-indigo-500/50 shadow-inner">
              <div id={qrRegionId} className="w-full min-h-[300px]"></div>

              {(isPaused || isSubmitting) && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 z-20">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                  <span className="font-bold text-sm">
                    {isSubmitting ? 'Mengesahkan transaksi Firestore...' : 'Menunggu imbasan seterusnya...'}
                  </span>
                  {!isSubmitting && <span className="text-xs text-slate-400">Jeda automatik ({pauseCountdown}s)</span>}
                </div>
              )}
            </div>

            {cameraError && (
              <div className="bg-rose-950/40 border border-rose-800/40 p-3.5 rounded-xl text-xs text-rose-300 text-center space-y-2">
                <p>{cameraError}</p>
                {canUseSimulator && (
                  <button
                    onClick={() => setScanMode('SIMULATOR')}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer"
                  >
                    Guna Mod Simulasi / Manual Admin
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {canUseSimulator && scanMode === 'SIMULATOR' && (
          <div className="space-y-6">
            <div className="max-w-md mx-auto space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Masukkan / Tampal Kod QR Staf (Contoh: <code className="text-indigo-400">{qrPrefix}|ST001</code>)
              </label>
              <div className="flex gap-2">
                <input
                  id="scanner-manual-qr-input"
                  type="text"
                  placeholder={`e.g. ${qrPrefix}|ST001`}
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualCode.trim()) {
                      handleExecuteScan(manualCode, 'MANUAL_OVERRIDE');
                      setManualCode('');
                    }
                  }}
                  className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  id="scanner-submit-manual-btn"
                  onClick={() => {
                    if (manualCode.trim()) {
                      handleExecuteScan(manualCode, 'MANUAL_OVERRIDE');
                      setManualCode('');
                    }
                  }}
                  disabled={!manualCode.trim() || isPaused || isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Imbas
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300">Pilih Staf Untuk Diimbas (Permanent QR Identity):</span>
                <span className="text-slate-400">Klik kad staf untuk imbas QR</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {staffList.map((staf) => (
                  <button
                    key={staf.id}
                    id={`scan-card-staff-${staf.id}`}
                    onClick={() => handleExecuteScan(`${qrPrefix}|${staf.id}`, 'SIMULATOR')}
                    disabled={isPaused || isSubmitting}
                    className="p-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 hover:border-indigo-500/50 rounded-xl transition-all text-left cursor-pointer group flex items-center space-x-3 disabled:opacity-50"
                  >
                    <img
                      src={staf.avatarUrl || buildStaffImageUrl(staf.id, avatarBaseUrl)}
                      alt={formatDisplayName(staf.name)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR_FALLBACK;
                      }}
                      className="w-10 h-10 rounded-full object-cover border border-slate-600 flex-shrink-0"
                    />
                    <div className="overflow-hidden">
                      <div className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
                        {formatDisplayName(staf.name)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <span className="text-indigo-400 font-bold">{qrPrefix}|{staf.id}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{staf.department}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {scanResult && (
          <div
            className={`p-5 rounded-2xl border transition-all animate-fadeIn ${
              scanResult.status === 'SUCCESS'
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-100 shadow-lg shadow-emerald-950/50'
                : scanResult.status === 'DUPLICATE'
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-100 shadow-lg shadow-amber-950/50'
                : 'bg-rose-950/80 border-rose-500/60 text-rose-100 shadow-lg shadow-rose-950/50'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-2xl bg-white/10 flex-shrink-0">
                {scanResult.status === 'SUCCESS' ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                ) : scanResult.status === 'DUPLICATE' ? (
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-rose-400" />
                )}
              </div>

              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-extrabold tracking-tight">{scanResult.title}</h3>
                  {scanResult.timestamp && (
                    <span className="text-xs font-mono bg-black/30 px-2.5 py-1 rounded-full border border-white/10">
                      {scanResult.timestamp}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm font-medium leading-relaxed opacity-90">{scanResult.message}</p>

                {scanResult.staff && (
                  <div className="pt-2 flex items-center space-x-3 border-t border-white/10 mt-2">
                    <div className="text-xs">
                      <span className="opacity-70">Nama Staf: </span>
                      <span className="font-bold">{formatDisplayName(scanResult.staff.name)}</span>
                    </div>
                    <span className="opacity-40">•</span>
                    <div className="text-xs font-mono">
                      <span className="opacity-70">ID: </span>
                      <span className="font-bold">{scanResult.staff.id}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
