import React, { useState } from 'react';
import {
  Search,
  Plus,
  QrCode,
  Printer,
  Mail,
  Building2,
  Play,
  FileSpreadsheet,
  Lock,
  FileOutput,
  Trash2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Staff, ScanResult } from '../types';
import { exportStaffToCSV } from '../utils/csvHelper';
import { buildStaffImageUrl, DEFAULT_AVATAR_FALLBACK, formatDisplayName } from '../utils/staffUtils';

interface StaffDirectoryViewProps {
  staffList: Staff[];
  institutionId: string;
  isInstitutionAdmin: boolean;
  canScan: boolean;
  qrPrefix?: string;
  defaultEmailDomain?: string;
  avatarBaseUrl?: string;
  onAddStaff: (newStaff: Staff) => Promise<void>;
  onDeleteStaff?: (staffId: string) => Promise<void>;
  onSimulateScan: (staffId: string) => Promise<ScanResult>;
  onOpenCSVImport: () => void;
}

function getNextSuggestedStaffId(list: Staff[]): string {
  let maxNum = 0;
  list.forEach((s) => {
    const match = s.id.toUpperCase().match(/^ST(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });
  return `ST${String(maxNum + 1).padStart(3, '0')}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[character];
  });
}

export const StaffDirectoryView: React.FC<StaffDirectoryViewProps> = ({
  staffList,
  institutionId,
  isInstitutionAdmin,
  canScan,
  qrPrefix = 'STAFF',
  defaultEmailDomain,
  avatarBaseUrl,
  onAddStaff,
  onDeleteStaff,
  onSimulateScan,
  onOpenCSVImport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [selectedStaffForQR, setSelectedStaffForQR] = useState<Staff | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    id: getNextSuggestedStaffId(staffList),
    name: '',
    department: 'Jabatan Sains Komputer',
    position: 'Pensyarah',
    email: '',
    phone: ''
  });

  const departments = ['ALL', ...Array.from(new Set(staffList.map((s) => s.department)))];

  const filteredStaff = staffList.filter((s) => {
    const matchesDept = departmentFilter === 'ALL' || s.department === departmentFilter;
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const openAddModal = () => {
    if (!isInstitutionAdmin) return;
    setFormData({
      id: getNextSuggestedStaffId(staffList),
      name: '',
      department: 'Jabatan Sains Komputer',
      position: 'Pensyarah',
      email: '',
      phone: ''
    });
    setIsAddModalOpen(true);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInstitutionAdmin || !formData.name.trim() || !formData.id.trim() || isSaving) return;

    const cleanId = formData.id.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanId) return;

    const fallbackEmail = defaultEmailDomain
      ? `staff@${defaultEmailDomain.replace(/^@/, '')}`
      : '';

    setIsSaving(true);
    try {
      await onAddStaff({
        id: cleanId,
        institutionId,
        name: formData.name.trim(),
        department: formData.department.trim() || 'Pentadbiran',
        position: formData.position.trim() || 'Staf',
        email: formData.email.trim() || fallbackEmail,
        ...(formData.phone.trim() ? { phone: formData.phone.trim() } : {}),
        status: 'ACTIVE',
        avatarUrl: buildStaffImageUrl(cleanId, avatarBaseUrl)
      });

      setIsAddModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = exportStaffToCSV(staffList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeInst = institutionId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'institusi';
    link.setAttribute('download', `senarai_staf_${safeInst}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintQRCard = () => {
    if (!selectedStaffForQR) return;

    const qrSvg = document.querySelector('#staff-qr-preview-code svg');
    if (!qrSvg) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.alert('Pelayar menyekat tetingkap cetak. Benarkan pop-up untuk laman StaffAttend dan cuba semula.');
      return;
    }

    const staffName = escapeHtml(formatDisplayName(selectedStaffForQR.name));
    const staffId = escapeHtml(selectedStaffForQR.id);
    const staffPosition = escapeHtml(selectedStaffForQR.position || 'Staf');
    const staffDepartment = escapeHtml(selectedStaffForQR.department || '');
    const qrValue = escapeHtml(`${cleanPrefix}|${selectedStaffForQR.id}`);

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="ms">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Kad QR ${staffId}</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; }
            body {
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 2.5mm;
              width: 54mm;
              height: 85.6mm;
              padding: 3.5mm;
              overflow: hidden;
              border: 0.35mm solid #334155;
              border-radius: 3mm;
              background: #fff;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .qr { flex: 0 0 31mm; width: 31mm; height: 31mm; }
            .qr svg { display: block; width: 100%; height: 100%; }
            .details { min-width: 0; width: 100%; flex: 0 0 auto; text-align: center; }
            .label { margin: 0 0 1.5mm; color: #4f46e5; font-size: 6.5pt; font-weight: 700; letter-spacing: .6pt; }
            .id { margin: 0 0 1.5mm; color: #4338ca; font-family: monospace; font-size: 8pt; font-weight: 700; overflow-wrap: anywhere; }
            .name { margin: 0 0 1mm; font-size: 10pt; line-height: 1.15; font-weight: 700; overflow-wrap: anywhere; }
            .position { margin: 0 0 1mm; color: #475569; font-size: 7.5pt; }
            .department { margin: 0; color: #64748b; font-size: 7pt; line-height: 1.15; overflow-wrap: anywhere; }
            @media screen {
              body { width: 100%; min-height: 100vh; height: 100vh; }
              .card { box-shadow: 0 4px 20px #0002; }
            }
          </style>
        </head>
        <body>
          <article class="card" aria-label="Kad QR staf ${staffName}">
            <div class="qr">${qrSvg.outerHTML}</div>
            <div class="details">
              <p class="label">STAFFATTEND · QR KEHADIRAN</p>
              <p class="id">${qrValue}</p>
              <h1 class="name">${staffName}</h1>
              <p class="position">${staffPosition}</p>
              <p class="department">${staffDepartment}</p>
            </div>
          </article>
          <script>
            window.addEventListener('load', () => {
              window.focus();
              window.print();
            });
            window.addEventListener('afterprint', () => window.close());
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  const cleanPrefix = (qrPrefix || 'STAFF').toUpperCase();

  return (
    <div id="staff-directory-view" className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Permanent Identity
            </span>
            <span className="text-slate-400 text-xs">Pangkalan Data Staf Master</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
            Direktori Staf & Kad QR Kekal
          </h2>
          <p className="text-xs text-slate-400">
            Setiap staf mempunyai <span className="text-indigo-300 font-bold">satu QR permanent</span> (e.g.{' '}
            <code className="text-indigo-400">{cleanPrefix}|ST001</code>) yang dipakai merentasi semua jenis program.
          </p>
        </div>

        {/* Action Buttons */}
        {isInstitutionAdmin ? (
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto">
            <button
              id="sync-csv-staff-btn"
              onClick={onOpenCSVImport}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer flex-1 sm:flex-none"
              title="Import & Sync data ahli melalui CSV"
            >
              <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Sync CSV</span>
            </button>

            <button
              id="add-new-staff-btn"
              onClick={openAddModal}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Daftar Staf</span>
            </button>
          </div>
        ) : (
          <div className="inline-flex items-center space-x-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs px-3 py-2 rounded-xl self-start md:self-auto">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Mod Bacaan Sahaja (Perlu Peranan Admin)</span>
          </div>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama staf, ID, atau emel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer flex-1 min-w-0 truncate"
          >
            {departments.map((d) => (
              <option key={d} value={d}>
                {d === 'ALL' ? 'Semua Jabatan' : d}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap flex-1 sm:flex-none"
            title="Eksport senarai staf ke CSV"
          >
            <FileOutput className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span>Eksport CSV</span>
          </button>
        </div>
      </div>

      {/* Staff horizontal directory */}
      {filteredStaff.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-500">
          Tiada staf berdaftar dalam institusi ini.
        </div>
      ) : (
        <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/30">
          <div
            className="w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x"
            style={{ WebkitOverflowScrolling: 'touch' }}
            aria-label="Direktori staf; leret mendatar untuk melihat semua lajur"
            tabIndex={0}
          >
            <div className="min-w-[900px] space-y-2 p-2">
              <div className="grid grid-cols-[52px_78px_minmax(160px,1.2fr)_minmax(120px,0.9fr)_minmax(170px,1.1fr)_184px] items-center gap-2.5 px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400">
                <div>PROFIL</div>
                <div>ID STAF</div>
                <div>NAMA STAF / JAWATAN</div>
                <div>JABATAN</div>
                <div>EMEL</div>
                <div className="text-right">TINDAKAN</div>
              </div>

              <div className="space-y-2">
                {filteredStaff.map((staf) => (
                  <div
                    key={staf.id}
                    className="grid grid-cols-[52px_78px_minmax(160px,1.2fr)_minmax(120px,0.9fr)_minmax(170px,1.1fr)_184px] min-h-[72px] items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 shadow-sm transition-colors hover:border-indigo-500/40"
                  >
                    <div className="flex items-center justify-center">
                      <img
                        src={staf.avatarUrl || buildStaffImageUrl(staf.id, avatarBaseUrl)}
                        alt={formatDisplayName(staf.name)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DEFAULT_AVATAR_FALLBACK;
                        }}
                        className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/30 flex-shrink-0"
                      />
                    </div>

                    <div className="min-w-0">
                      <span className="inline-block max-w-full truncate bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] px-2 py-1 rounded border border-indigo-500/30">
                        {staf.id}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3
                        className="truncate font-bold text-white text-xs sm:text-sm"
                        title={formatDisplayName(staf.name)}
                      >
                        {formatDisplayName(staf.name)}
                      </h3>
                      <p className="truncate text-[11px] text-slate-400" title={staf.position}>
                        {staf.position}
                      </p>
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400" title={staf.department}>
                      <Building2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{staf.department}</span>
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400" title={staf.email || '-'}>
                      <Mail className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{staf.email || '-'}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button
                        id={`staff-card-qr-btn-${staf.id}`}
                        onClick={() => setSelectedStaffForQR(staf)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-600/20 px-2.5 py-2 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-600/30 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Kad QR</span>
                      </button>

                      {isInstitutionAdmin && canScan && (
                        <button
                          id={`staff-card-test-btn-${staf.id}`}
                          onClick={() => {
                            void onSimulateScan(staf.id);
                          }}
                          className="rounded-lg bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white cursor-pointer"
                          title="Uji imbas staf ini"
                          aria-label={`Uji imbas ${formatDisplayName(staf.name)}`}
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      )}

                      {isInstitutionAdmin && onDeleteStaff && (
                        <button
                          id={`staff-card-delete-btn-${staf.id}`}
                          onClick={() => {
                            if (window.confirm(`Padam staf ${formatDisplayName(staf.name)} (${staf.id})?`)) {
                              void onDeleteStaff(staf.id);
                            }
                          }}
                          className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 text-rose-400 transition-colors hover:bg-rose-500/20 cursor-pointer"
                          title="Padam staf ini"
                          aria-label={`Padam ${formatDisplayName(staf.name)}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Staff */}
      {isAddModalOpen && isInstitutionAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white">
            <h3 className="text-lg font-bold">Daftar Staf Baharu</h3>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">ID Staf (Unique Primary Key) *</label>
                <input
                  type="text"
                  required
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nama Penuh *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Zulkifli bin Mohamad"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Jabatan / Unit</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Jabatan Sains Komputer"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Jawatan</label>
                <input
                  type="text"
                  placeholder="e.g. Pensyarah Kanan"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Emel Rasmi</label>
                <input
                  type="email"
                  placeholder={defaultEmailDomain ? `e.g. staf@${defaultEmailDomain.replace(/^@/, '')}` : 'e.g. staf@institusi.edu.my'}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-slate-800 text-slate-300 font-medium px-4 py-2 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer"
                >
                  Daftar Staf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Staff Permanent QR Card View & Print */}
      {selectedStaffForQR && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-5 text-white text-center">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Kad Identiti Digital Staf
              </span>
              <button
                onClick={() => setSelectedStaffForQR(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Print Area Preview */}
            <div className="p-5 bg-white text-slate-900 rounded-2xl shadow-xl space-y-3 print:p-0 print:shadow-none">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                PERMANENT STAFF QR
              </div>

              {/* QR Code SVG */}
              <div id="staff-qr-preview-code" className="p-3 bg-slate-50 inline-block rounded-xl border border-slate-200">
                <QRCodeSVG
                  value={`${cleanPrefix}|${selectedStaffForQR.id}`}
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="space-y-0.5">
                <div className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                  {cleanPrefix}|{selectedStaffForQR.id}
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 pt-1">
                  {formatDisplayName(selectedStaffForQR.name)}
                </h4>
                <p className="text-xs text-slate-600 font-medium">{selectedStaffForQR.position}</p>
                <p className="text-[11px] text-slate-500">{selectedStaffForQR.department}</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic leading-snug">
              Kad ini sah digunakan untuk imbasan kehadiran merentasi semua jenis acara/program.
            </p>

            <div className="pt-2 flex items-center justify-center space-x-2">
              <button
                onClick={handlePrintQRCard}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kad</span>
              </button>
              {isInstitutionAdmin && canScan && (
                <button
                  onClick={() => {
                    void onSimulateScan(selectedStaffForQR.id);
                    setSelectedStaffForQR(null);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-md flex items-center space-x-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Uji Imbas</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
