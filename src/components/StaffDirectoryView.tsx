import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  QrCode, 
  Printer, 
  Download, 
  CheckCircle2, 
  Mail, 
  Phone, 
  Building2,
  Sparkles,
  Zap,
  Play,
  FileSpreadsheet,
  Lock,
  FileOutput,
  Trash2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Staff, ScanResult } from '../types';
import { exportStaffToCSV } from '../utils/csvHelper';
import { buildStaffImageUrl, DEFAULT_AVATAR_FALLBACK } from '../utils/staffUtils';

interface StaffDirectoryViewProps {
  staffList: Staff[];
  isAdmin: boolean;
  onAddStaff: (newStaff: Staff) => void;
  onDeleteStaff?: (staffId: string) => void;
  onSimulateScan: (staffId: string) => ScanResult;
  onRequestAdminAccess: (actionName?: string) => void;
  onOpenCSVImport: () => void;
}

export const StaffDirectoryView: React.FC<StaffDirectoryViewProps> = ({
  staffList,
  isAdmin,
  onAddStaff,
  onDeleteStaff,
  onSimulateScan,
  onRequestAdminAccess,
  onOpenCSVImport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [selectedStaffForQR, setSelectedStaffForQR] = useState<Staff | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New staff form state
  const [formData, setFormData] = useState({
    id: `ST00${staffList.length + 1}`,
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
      s.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.id.trim()) return;

    onAddStaff({
      id: formData.id.toUpperCase(),
      name: formData.name,
      department: formData.department,
      position: formData.position,
      email: formData.email || 'staff@bpenawar.kpm.edu.my',
      phone: formData.phone || '+60 12-000 0000',
      status: 'ACTIVE',
      avatarUrl: buildStaffImageUrl(formData.id.toUpperCase())
    });

    setIsAddModalOpen(false);
    setFormData({
      id: `ST00${staffList.length + 2}`,
      name: '',
      department: 'Jabatan Sains Komputer',
      position: 'Pensyarah',
      email: '',
      phone: ''
    });
  };

  const handleExportCSV = () => {
    const csvContent = exportStaffToCSV(staffList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'senarai_staf_my_attendance.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print function
  const handlePrintQRCard = () => {
    window.print();
  };

  const handleAddStaffClick = () => {
    if (!isAdmin) {
      onRequestAdminAccess('Pendaftaran Staf Baharu');
    } else {
      setIsAddModalOpen(true);
    }
  };

  const handleCSVImportClick = () => {
    if (!isAdmin) {
      onRequestAdminAccess('Penyelarasan Data CSV Staf');
    } else {
      onOpenCSVImport();
    }
  };

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
            Setiap staf mempunyai <span className="text-indigo-300 font-bold">satu QR permanent</span> (e.g. <code className="text-indigo-400">STAFF|ST001</code>) yang dipakai merentasi semua jenis program.
          </p>
        </div>

        {/* Action Buttons: 2 equal buttons on mobile */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto">
          <button
            id="sync-csv-staff-btn"
            onClick={handleCSVImportClick}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-3 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer flex-1 sm:flex-none"
            title="Import & Sync data ahli melalui CSV"
          >
            <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Sync CSV</span>
            {!isAdmin && <Lock className="w-3 h-3 text-amber-300 ml-0.5 flex-shrink-0" />}
          </button>

          <button
            id="add-new-staff-btn"
            onClick={handleAddStaffClick}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">Daftar Staf</span>
            {!isAdmin && <Lock className="w-3 h-3 text-amber-300 ml-0.5 flex-shrink-0" />}
          </button>
        </div>
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


      {/* Staff Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredStaff.map((staf) => (
          <div
            key={staf.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <img
                  src={staf.avatarUrl || buildStaffImageUrl(staf.id)}
                  alt={staf.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR_FALLBACK;
                  }}
                  className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/30 flex-shrink-0"
                />
                <div className="overflow-hidden">
                  <span className="bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] px-2 py-0.5 rounded border border-indigo-500/30">
                    {staf.id}
                  </span>
                  <h3 className="font-bold text-white text-xs sm:text-sm mt-1 truncate" title={staf.name}>
                    {staf.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">{staf.position}</p>
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <div className="flex items-center space-x-1.5 truncate">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{staf.department}</span>
                </div>
                <div className="flex items-center space-x-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{staf.email || 'staff@bpenawar.kpm.edu.my'}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                id={`staff-card-qr-btn-${staf.id}`}
                onClick={() => setSelectedStaffForQR(staf)}
                className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold py-1.5 rounded-xl transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Kad QR Staf</span>
              </button>

              <button
                id={`staff-card-test-btn-${staf.id}`}
                onClick={() => onSimulateScan(staf.id)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
                title="Uji imbas staf ini"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              {isAdmin && onDeleteStaff && (
                <button
                  id={`staff-card-delete-btn-${staf.id}`}
                  onClick={() => {
                    if (window.confirm(`Padam staf ${staf.name} (${staf.id})?`)) {
                      onDeleteStaff(staf.id);
                    }
                  }}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-colors cursor-pointer"
                  title="Padam staf ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add New Staff */}
      {isAddModalOpen && (
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
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Jabatan Sains Komputer">Jabatan Sains Komputer</option>
                  <option value="Jabatan Kejuruteraan">Jabatan Kejuruteraan</option>
                  <option value="Teknologi Maklumat (IT)">Teknologi Maklumat (IT)</option>
                  <option value="Kewangan & Sumber Manusia">Kewangan & Sumber Manusia</option>
                  <option value="Hal Ehwal Pelajar">Hal Ehwal Pelajar</option>
                  <option value="Perpustakaan & Sumber">Perpustakaan & Sumber</option>
                </select>
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
                  placeholder="e.g. staff@bpenawar.kpm.edu.my"
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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer"
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
              <div className="p-3 bg-slate-50 inline-block rounded-xl border border-slate-200">
                <QRCodeSVG
                  value={`STAFF|${selectedStaffForQR.id}`}
                  size={160}
                  level="H"
                  includeMargin={false}
                />
              </div>

              <div className="space-y-0.5">
                <div className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                  STAFF|{selectedStaffForQR.id}
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 pt-1">
                  {selectedStaffForQR.name}
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
              <button
                onClick={() => {
                  onSimulateScan(selectedStaffForQR.id);
                  setSelectedStaffForQR(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Uji Imbas</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
