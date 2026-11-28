import React from 'react';
import {
  Calendar,
  Users,
  CheckCircle2,
  QrCode,
  Clock,
  Zap,
  ArrowRight,
  TrendingUp,
  Building2,
  AlertTriangle,
  Play
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { EventItem, Staff, AttendanceRecord, ScanResult } from '../types';
import { buildStaffImageUrl, DEFAULT_AVATAR_FALLBACK, formatDisplayName } from '../utils/staffUtils';

interface DashboardViewProps {
  activeEvent: EventItem | null;
  staffList: Staff[];
  attendanceRecords: AttendanceRecord[];
  isInstitutionAdmin: boolean;
  canScan: boolean;
  avatarBaseUrl?: string;
  onOpenScanner: () => void;
  onGoToEvents: () => void;
  onGoToStaff: () => void;
  onCloseActiveEvent: (eventId: string) => void;
  onQuickSimulateScan: (staffId: string) => Promise<ScanResult>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  activeEvent,
  staffList,
  attendanceRecords,
  isInstitutionAdmin,
  canScan,
  avatarBaseUrl,
  onOpenScanner,
  onGoToEvents,
  onGoToStaff,
  onCloseActiveEvent,
  onQuickSimulateScan
}) => {
  const activeEventRecords = activeEvent
    ? attendanceRecords.filter((r) => r.eventId === activeEvent.id)
    : [];

  const activeCount = activeEventRecords.length;
  const targetCount = activeEvent?.targetCount || staffList.length || 1;
  const attendancePercentage = Math.min(100, Math.round((activeCount / targetCount) * 100));

  const deptMap: Record<string, number> = {};
  activeEventRecords.forEach((r) => {
    deptMap[r.staffDepartment] = (deptMap[r.staffDepartment] || 0) + 1;
  });

  const departmentChartData = Object.keys(deptMap).map((dept) => ({
    name: dept.replace('Jabatan ', ''),
    hadir: deptMap[dept]
  }));

  return (
    <div id="dashboard-view-container" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Pusat Operasi Kehadiran
            </span>
            <span className="text-slate-400 text-xs font-mono">• Event-Based Context</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Papan Pemuka Utama
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Pantau status acara aktif dan statistik imbasan masa nyata institusi anda.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            id="dashboard-goto-events-btn"
            onClick={onGoToEvents}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3.5 py-2.5 rounded-xl transition-colors border border-slate-700 flex items-center justify-center space-x-1.5 cursor-pointer flex-1 sm:flex-none"
          >
            <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>Urus Event</span>
          </button>
          {canScan && (
            <button
              id="dashboard-open-scanner-primary-btn"
              onClick={onOpenScanner}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer flex-1 sm:flex-none"
            >
              <QrCode className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Scanner QR</span>
            </button>
          )}
        </div>
      </div>

      {activeEvent ? (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950/80 border border-indigo-500/30 rounded-2xl p-5 shadow-md relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center space-x-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  Event Sedang Berlangsung (OPEN)
                </span>
                <span className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                  ID: {activeEvent.id}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
                {activeEvent.name}
              </h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-300">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{activeEvent.date} ({activeEvent.startTime} - {activeEvent.endTime})</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{activeEvent.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px]">
                    Kategori: {activeEvent.category}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-700/80 p-4 rounded-xl min-w-[260px] space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Jumlah Kehadiran:</span>
                <span className="text-white font-bold font-mono">
                  {activeCount} / {targetCount} orang
                </span>
              </div>

              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${attendancePercentage}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                {isInstitutionAdmin && (
                  <button
                    id="dashboard-close-event-btn"
                    onClick={() => onCloseActiveEvent(activeEvent.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-800/40 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Tutup Event (CLOSE)
                  </button>
                )}
                {canScan && (
                  <button
                    id="dashboard-go-to-scanner-btn"
                    onClick={onOpenScanner}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer ml-auto"
                  >
                    <span>Mula Scan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-5 text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-300">Tiada Event Aktif (OPEN)</h3>
              <p className="text-xs text-amber-200/80">
                Sistem perlukan konteks event untuk merekod imbasan. Buka (OPEN) mana-mana event untuk memulakan pengimbasan.
              </p>
            </div>
          </div>
          <button
            id="dashboard-activate-event-now-btn"
            onClick={onGoToEvents}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-md"
          >
            Lihat Acara
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Hadir Event Aktif</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white font-mono">{activeCount}</span>
            <span className="text-xs text-slate-400">peserta</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Daripada sasaran {targetCount} staf</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Kadar Kehadiran</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-400 font-mono">{attendancePercentage}%</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Peratus kelayakan bagi event ini</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Master Pangkalan Staf</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white font-mono">{staffList.length}</span>
            <span className="text-xs text-slate-400">staf berdaftar</span>
          </div>
          <button
            onClick={onGoToStaff}
            className="text-[11px] text-indigo-400 hover:underline mt-1 block text-left cursor-pointer"
          >
            Lihat Kad QR Staf &rarr;
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-medium">Jumlah Transaksi Imbasan</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white font-mono">{attendanceRecords.length}</span>
            <span className="text-xs text-slate-400">rekod keseluruhan</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Merentasi semua acara</p>
        </div>
      </div>

      {/* Admin-only Quick Interactive Simulator Block */}
      {isInstitutionAdmin && staffList.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Simulasi Ujian Imbasan Pantas (Admin Sahaja)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Klik mana-mana kad staf untuk menguji transaksi atomik Firestore & pengesanan duplikasi:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {staffList.slice(0, 8).map((staf) => {
              const isHadir = activeEventRecords.some((r) => r.staffId === staf.id);
              return (
                <button
                  key={staf.id}
                  id={`sim-scan-staff-${staf.id}`}
                  onClick={() => onQuickSimulateScan(staf.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2.5 ${
                    isHadir
                      ? 'bg-emerald-950/30 border-emerald-500/40 hover:bg-emerald-900/40'
                      : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-700 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={staf.avatarUrl || buildStaffImageUrl(staf.id, avatarBaseUrl)}
                      alt={formatDisplayName(staf.name)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_AVATAR_FALLBACK;
                      }}
                      className="w-8 h-8 rounded-full object-cover border border-slate-600"
                    />
                    {isHadir && (
                      <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 text-[8px]">
                        <CheckCircle2 className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-semibold text-white truncate">
                      {formatDisplayName(`${staf.name.split(' ')[0]} ${staf.name.split(' ')[1] || ''}`)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{staf.id}</div>
                  </div>
                  <Play className="w-3 h-3 text-indigo-400 ml-auto flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Kehadiran Mengikut Jabatan ({activeEvent?.name || 'Semua'})</span>
          </h3>

          {departmentChartData.length > 0 ? (
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="hadir" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-500 text-xs italic">
              Belum ada rekod imbasan bagi acara aktif ini.
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Aktiviti Imbasan Terkini</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Real-Time</span>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {attendanceRecords.length > 0 ? (
              attendanceRecords.slice(0, 7).map((rec) => (
                <div
                  key={rec.id}
                  className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">{formatDisplayName(rec.staffName)}</div>
                    <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                      <span className="text-indigo-300 font-mono">{rec.staffId}</span>
                      <span>•</span>
                      <span>{rec.staffDepartment}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      {rec.formattedTime}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                Tiada rekod imbasan.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
