import React, { useState } from 'react';
import {
  FileText,
  Download,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  Trash2,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import { AttendanceRecord, EventItem, Staff } from '../types';
import { sanitizeCSVCell } from '../utils/csvHelper';
import { formatDisplayName } from '../utils/staffUtils';

interface ReportsViewProps {
  attendanceRecords: AttendanceRecord[];
  events: EventItem[];
  staffList: Staff[];
  isInstitutionAdmin: boolean;
  institutionName?: string;
  onClearRecords: () => Promise<void>;
}

type ViewMode = 'SHEET_BOSS' | 'LOG_TRANSACTIONS';
type SortOption = 'STAFF_ID' | 'DEPARTMENT' | 'STATUS_ATTENDED' | 'NAME';

export const ReportsView: React.FC<ReportsViewProps> = ({
  attendanceRecords,
  events,
  staffList,
  isInstitutionAdmin,
  institutionName,
  onClearRecords
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('SHEET_BOSS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DEPARTMENT');
  const [groupByDept, setGroupByDept] = useState<boolean>(true);
  const [isClearing, setIsClearing] = useState(false);

  const departments = ['ALL', ...Array.from(new Set(staffList.map((s) => s.department)))];
  const currentEvent = events.find((e) => e.id === selectedEventId) || null;

  const getSheetData = () => {
    const targetRecords =
      selectedEventId === 'ALL'
        ? attendanceRecords
        : attendanceRecords.filter((r) => r.eventId === selectedEventId);

    const attendanceMap = new Map<string, AttendanceRecord>();
    targetRecords.forEach((r) => {
      if (!attendanceMap.has(r.staffId)) {
        attendanceMap.set(r.staffId, r);
      }
    });

    let rows = staffList.map((staff) => {
      const record = attendanceMap.get(staff.id);
      return {
        staff,
        isAttended: !!record,
        recordTime: record ? record.formattedTime : '-',
        method: record ? record.method : '-',
        eventName: record ? record.eventName : currentEvent ? currentEvent.name : 'N/A'
      };
    });

    if (selectedDepartment !== 'ALL') {
      rows = rows.filter((r) => r.staff.department === selectedDepartment);
    }

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.staff.name.toLowerCase().includes(query) ||
          r.staff.id.toLowerCase().includes(query) ||
          r.staff.department.toLowerCase().includes(query) ||
          r.staff.position.toLowerCase().includes(query)
      );
    }

    rows.sort((a, b) => {
      if (sortBy === 'DEPARTMENT') {
        const deptCompare = a.staff.department.localeCompare(b.staff.department);
        if (deptCompare !== 0) return deptCompare;
        return a.staff.id.localeCompare(b.staff.id);
      }
      if (sortBy === 'STAFF_ID') {
        return a.staff.id.localeCompare(b.staff.id);
      }
      if (sortBy === 'NAME') {
        return a.staff.name.localeCompare(b.staff.name);
      }
      if (sortBy === 'STATUS_ATTENDED') {
        if (a.isAttended === b.isAttended) {
          return a.staff.id.localeCompare(b.staff.id);
        }
        return a.isAttended ? -1 : 1;
      }
      return 0;
    });

    return rows;
  };

  const sheetRows = getSheetData();

  const totalEligible = sheetRows.length;
  const totalAttended = sheetRows.filter((r) => r.isAttended).length;
  const totalAbsent = totalEligible - totalAttended;
  const attendancePercentage = totalEligible > 0 ? Math.round((totalAttended / totalEligible) * 100) : 0;

  const groupedData = React.useMemo(() => {
    const map = new Map<string, typeof sheetRows>();
    sheetRows.forEach((row) => {
      const dept = row.staff.department;
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(row);
    });
    return map;
  }, [sheetRows]);

  const handleExportSheetCSV = () => {
    const headers = [
      'No. ID Staf',
      'Nama Penuh Staf',
      'Kategori Unit / Jabatan',
      'Jawatan',
      'Status Kehadiran',
      'Masa Imbasan',
      'Nama Acara / Event'
    ];

    const csvRows = sheetRows.map((r) => [
      `"${sanitizeCSVCell(r.staff.id)}"`,
      `"${sanitizeCSVCell(r.staff.name)}"`,
      `"${sanitizeCSVCell(r.staff.department)}"`,
      `"${sanitizeCSVCell(r.staff.position)}"`,
      `"${sanitizeCSVCell(r.isAttended ? 'HADIR' : 'BELUM HADIR')}"`,
      `"${sanitizeCSVCell(r.recordTime)}"`,
      `"${sanitizeCSVCell(r.eventName)}"`
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const eventLabel = currentEvent ? currentEvent.name.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Semua_Acara';
    link.setAttribute('download', `Lembaran_Kehadiran_${eventLabel}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const filteredAuditRecords = attendanceRecords.filter((rec) => {
    const matchesEvent = selectedEventId === 'ALL' || rec.eventId === selectedEventId;
    const matchesDept = selectedDepartment === 'ALL' || rec.staffDepartment === selectedDepartment;
    const matchesSearch =
      rec.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.staffId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.eventName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesEvent && matchesDept && matchesSearch;
  });

  return (
    <div id="reports-view-container" className="space-y-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-boss-sheet, #printable-boss-sheet * {
            visibility: visible;
          }
          #printable-boss-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Penyediaan Laporan Pengurusan
            </span>
            <span className="text-slate-400 text-xs">Jadual Lembaran Rasmi (Sheet List)</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Lembaran Kehadiran Mengikut ID & Kategori Unit
          </h2>
          <p className="text-xs text-slate-400">
            Penyediaan senarai semak kehadiran bersusun mengikut ID Staf dan Kategori Unit/Jabatan khas untuk semakan Pihak Pengurusan.
          </p>
        </div>

        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 self-start md:self-auto">
          <button
            onClick={() => setViewMode('SHEET_BOSS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'SHEET_BOSS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>REPORT</span>
          </button>
          <button
            onClick={() => setViewMode('LOG_TRANSACTIONS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              viewMode === 'LOG_TRANSACTIONS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>LOG</span>
          </button>
        </div>
      </div>

      {/* Primary Filters Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Cari ID Staf, Nama, atau Unit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
            >
              <option value="ALL">Semua Program / Event ({events.length})</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.date})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'ALL' ? 'Semua Kategori Unit / Jabatan' : d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full bg-slate-800 border border-slate-700 text-indigo-300 font-semibold text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="DEPARTMENT">Susun: Kategori Unit &rarr; ID Staf</option>
              <option value="STAFF_ID">Susun: No. ID Staf (A-Z)</option>
              <option value="NAME">Susun: Nama Penuh Staf</option>
              <option value="STATUS_ATTENDED">Susun: Status Hadir Dahulu</option>
            </select>
          </div>
        </div>

        {viewMode === 'SHEET_BOSS' && (
          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 gap-3 text-xs">
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-slate-300 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupByDept}
                  onChange={(e) => setGroupByDept(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span>Kelompokkan Penuh Mengikut Kategori Unit</span>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrintSheet}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembaran Rasmi (A4)</span>
              </button>

              <button
                onClick={handleExportSheetCSV}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksport Excel / CSV</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOSS SHEET VIEW MODE */}
      {viewMode === 'SHEET_BOSS' && (
        <div id="printable-boss-sheet" className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Jumlah Kelayakan</div>
              <div className="text-2xl font-extrabold text-white mt-1">
                {totalEligible} <span className="text-xs text-slate-400 font-normal">Staf</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow-sm bg-emerald-950/20">
              <div className="text-[11px] text-emerald-400 font-medium uppercase tracking-wider">Telah Hadir</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {totalAttended} <span className="text-xs text-emerald-300 font-normal">Staf</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-rose-500/20 p-4 rounded-2xl shadow-sm bg-rose-950/10">
              <div className="text-[11px] text-rose-400 font-medium uppercase tracking-wider">Belum Hadir</div>
              <div className="text-2xl font-extrabold text-rose-400 mt-1">
                {totalAbsent} <span className="text-xs text-rose-300 font-normal">Staf</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl shadow-sm bg-indigo-950/20">
              <div className="text-[11px] text-indigo-300 font-medium uppercase tracking-wider">Peratus Kehadiran</div>
              <div className="text-2xl font-extrabold text-indigo-300 mt-1">{attendancePercentage}%</div>
            </div>
          </div>

          <div className="hidden print:block border-b-2 border-black pb-4 mb-4 text-black">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold uppercase tracking-wide">LEMBARAN REKOD KEHADIRAN STAF RASMI</h1>
                <p className="text-xs">{institutionName || 'StaffAttend Multi-Institusi'}</p>
              </div>
              <div className="text-right text-xs">
                <p>
                  <strong>Tarikh Cetakan:</strong> {new Date().toLocaleDateString('ms-MY')}
                </p>
                <p>
                  <strong>Program/Event:</strong> {currentEvent ? currentEvent.name : 'Semua Acara'}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs border border-black p-2 bg-slate-100 rounded">
              <div>
                <strong>Jumlah Layak:</strong> {totalEligible}
              </div>
              <div>
                <strong>Hadir:</strong> {totalAttended}
              </div>
              <div>
                <strong>Belum Hadir:</strong> {totalAbsent}
              </div>
              <div>
                <strong>Peratusan:</strong> {attendancePercentage}%
              </div>
            </div>
          </div>

          {groupByDept ? (
            <div className="space-y-5">
              {groupedData.size === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs italic">
                  Tiada data staf untuk dipaparkan.
                </div>
              ) : (
                Array.from(groupedData.entries()).map(([deptName, rows]) => {
                  const deptAttended = rows.filter((r) => r.isAttended).length;
                  const deptTotal = rows.length;
                  const deptPct = Math.round((deptAttended / deptTotal) * 100);

                  return (
                    <div
                      key={deptName}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg print:border-black print:rounded-none print:shadow-none"
                    >
                      <div className="bg-slate-800/80 print:bg-slate-200 print:text-black p-3.5 px-5 flex flex-wrap items-center justify-between border-b border-slate-700/80">
                        <div className="flex items-center space-x-2.5">
                          <Building2 className="w-4 h-4 text-indigo-400 print:text-black" />
                          <h3 className="font-bold text-sm text-white print:text-black">{deptName}</h3>
                          <span className="text-xs text-slate-400 print:text-black">({deptTotal} Ahli/Staf)</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs">
                          <span className="text-slate-300 font-mono print:text-black">
                            Hadir: <strong className="text-emerald-400 print:text-black">{deptAttended}</strong> /{' '}
                            {deptTotal} ({deptPct}%)
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-300 print:text-black">
                          <thead className="bg-slate-900/60 print:bg-slate-100 text-slate-400 print:text-black font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="p-3 pl-5 w-24">No. ID Staf</th>
                              <th className="p-3">Nama Penuh Staf</th>
                              <th className="p-3">Jawatan</th>
                              <th className="p-3 text-center">Status Kehadiran</th>
                              <th className="p-3 pr-5 text-right">Masa Imbasan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 print:divide-slate-300">
                            {rows.map((row) => (
                              <tr key={row.staff.id} className="hover:bg-slate-800/30 print:hover:bg-transparent">
                                <td className="p-3 pl-5 font-mono font-bold text-indigo-300 print:text-black">
                                  {row.staff.id}
                                </td>
                                <td className="p-3 font-semibold text-white print:text-black">{formatDisplayName(row.staff.name)}</td>
                                <td className="p-3 text-slate-400 print:text-black">{row.staff.position}</td>
                                <td className="p-3 text-center">
                                  {row.isAttended ? (
                                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 print:border-black print:bg-white print:text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400 print:text-black" />
                                      <span>HADIR</span>
                                    </span>
                                  ) : (
                                    <span className="bg-slate-800/80 text-slate-500 border border-slate-700 print:border-black print:bg-white print:text-black text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                                      <XCircle className="w-3 h-3 text-slate-500 print:text-black" />
                                      <span>BELUM HADIR</span>
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 pr-5 text-right font-mono font-bold text-emerald-400 print:text-black">
                                  {row.recordTime}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg print:border-black print:rounded-none">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 print:text-black">
                  <thead className="bg-slate-800/80 print:bg-slate-200 text-slate-400 print:text-black font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5 pl-5">No. ID Staf</th>
                      <th className="p-3.5">Nama Penuh Staf</th>
                      <th className="p-3.5">Kategori Unit / Jabatan</th>
                      <th className="p-3.5">Jawatan</th>
                      <th className="p-3.5 text-center">Status Kehadiran</th>
                      <th className="p-3.5 pr-5 text-right">Masa Imbasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-slate-300">
                    {sheetRows.length > 0 ? (
                      sheetRows.map((row) => (
                        <tr key={row.staff.id} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                          <td className="p-3.5 pl-5 font-mono font-bold text-indigo-300 print:text-black">
                            {row.staff.id}
                          </td>
                          <td className="p-3.5 font-bold text-white print:text-black">{formatDisplayName(row.staff.name)}</td>
                          <td className="p-3.5 text-slate-300 print:text-black font-medium">
                            {row.staff.department}
                          </td>
                          <td className="p-3.5 text-slate-400 print:text-black">{row.staff.position}</td>
                          <td className="p-3.5 text-center">
                            {row.isAttended ? (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 print:border-black print:bg-white print:text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400 print:text-black" />
                                <span>HADIR</span>
                              </span>
                            ) : (
                              <span className="bg-slate-800/80 text-slate-500 border border-slate-700 print:border-black print:bg-white print:text-black text-[10px] font-medium px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                                <XCircle className="w-3 h-3 text-slate-500 print:text-black" />
                                <span>BELUM HADIR</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 pr-5 text-right font-mono font-bold text-emerald-400 print:text-black">
                            {row.recordTime}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 text-xs italic">
                          Tiada staf dijumpai berdasarkan carian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="hidden print:block pt-10 text-black">
            <div className="grid grid-cols-2 gap-8 text-xs">
              <div>
                <p className="font-bold border-b border-black pb-1 mb-2">Disediakan Oleh (Urus Setia):</p>
                <div className="h-16"></div>
                <p>Nama: _______________________</p>
                <p>Jawatan: Urus Setia Kehadiran</p>
                <p>Tarikh: _______________________</p>
              </div>
              <div>
                <p className="font-bold border-b border-black pb-1 mb-2">Disahkan Oleh (Ketua Jabatan / Bos):</p>
                <div className="h-16"></div>
                <p>Nama: _______________________</p>
                <p>Jawatan: _____________________</p>
                <p>Tarikh: _______________________</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RAW TRANSACTIONS LOG MODE */}
      {viewMode === 'LOG_TRANSACTIONS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg space-y-0">
          <div className="p-4 bg-slate-800/60 border-b border-slate-700/80 flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Log Transaksi Imbasan Masa Nyata</h3>
            <span className="text-xs text-slate-400">
              {filteredAuditRecords.length} rekod transaksi ditemui
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5 pl-5">ID Staf & Nama</th>
                  <th className="p-3.5">Kategori Unit / Jabatan</th>
                  <th className="p-3.5">Nama Acara / Event</th>
                  <th className="p-3.5">Masa Imbasan</th>
                  <th className="p-3.5">Kaedah</th>
                  <th className="p-3.5 pr-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAuditRecords.length > 0 ? (
                  filteredAuditRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-white">{formatDisplayName(rec.staffName)}</div>
                        <div className="text-[10px] text-indigo-400 font-mono">ID: {rec.staffId}</div>
                      </td>
                      <td className="p-3.5 text-slate-300">{rec.staffDepartment}</td>
                      <td className="p-3.5 max-w-[220px]">
                        <div className="font-medium text-white truncate" title={rec.eventName}>
                          {rec.eventName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">Event ID: {rec.eventId}</div>
                      </td>
                      <td className="p-3.5 font-mono text-emerald-400 font-bold">{rec.formattedTime}</td>
                      <td className="p-3.5">
                        <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px]">
                          {rec.method}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>REKOD SAH</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500 text-xs italic">
                      Tiada rekod imbasan yang sepadan dengan tapisan carian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-slate-800/40 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
            <div>
              Menunjukkan <span className="text-white font-bold">{filteredAuditRecords.length}</span> daripada{' '}
              <span className="text-white font-bold">{attendanceRecords.length}</span> rekod.
            </div>
            {isInstitutionAdmin && (
              <button
                disabled={isClearing}
                onClick={() => {
                  setIsClearing(true);
                  void onClearRecords().finally(() => setIsClearing(false));
                }}
                className="text-xs text-rose-400 hover:underline cursor-pointer flex items-center space-x-1 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Kosongkan Rekod</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
