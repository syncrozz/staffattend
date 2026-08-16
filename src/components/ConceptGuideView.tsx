import React from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  QrCode, 
  Layers, 
  Cpu, 
  Database, 
  Volume2, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  HelpCircle,
  FileCode2,
  Workflow
} from 'lucide-react';

export const ConceptGuideView: React.FC = () => {
  return (
    <div id="concept-guide-container" className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Hero Title Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 text-white shadow-xl space-y-3">
        <div className="flex items-center space-x-2">
          <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Dokumentasi Konsep Architecture
          </span>
          <span className="text-slate-400 text-xs font-mono">• Event-Based Attendance Engine</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Panduan Konsep & Falsafah Reka Bentuk Sistem
        </h2>

        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-3xl">
          Sistem ini pada asasnya ialah sebuah <strong className="text-indigo-300">platform pengurusan kehadiran berasaskan acara (event-based attendance platform)</strong>. Ia bukan sekadar aplikasi scan QR biasa.
        </p>

        <div className="p-4 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs font-medium flex items-center space-x-3">
          <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <span>
            <strong>Formula Utama Konsep:</strong> <code className="bg-black/40 px-2 py-0.5 rounded text-indigo-300">STAFF + QR PERMANENT + ACTIVE EVENT + VALIDATION = ATTENDANCE TRANSACTION</code>
          </span>
        </div>
      </div>

      {/* Grid of the 17 Core Principles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Principle 1 & 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
            <span className="p-1.5 bg-indigo-500/10 rounded-lg">01</span>
            <h3>Masalah Yang Hendak Diselesaikan</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Sistem biasa menjana QR berbeza setiap kali program diadakan. Kesannya: QR perlu dijana semula, data bercampur, duplicate attendance sukar dikawal, dan bergantung kepada spreadsheet manual.
          </p>
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 space-y-1 font-mono">
            <div>Sistem Ini:</div>
            <div className="text-emerald-400">STAFF &rarr; QR Kekal &rarr; Scan &rarr; Active Event Check &rarr; Rekod Autotrading</div>
          </div>
        </div>

        {/* Principle 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
            <span className="p-1.5 bg-indigo-500/10 rounded-lg">02</span>
            <h3>QR Staff Adalah Permanent Identity</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            QR hanya mengandungi identiti staf (contoh: <code className="text-indigo-400 font-mono">STAFF|ST001</code>). QR tidak mengandungi EventID, Tarikh, Masa, atau Status Event. Staf menyimpan 1 QR sahaja untuk semua program sepanjang tahun.
          </p>
          <div className="flex items-center space-x-2 text-[11px] text-emerald-400 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Satu QR kekal digunakan untuk Mesyuarat, Kursus, Program, Taklimat & Aktiviti.</span>
          </div>
        </div>

        {/* Principle 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
            <span className="p-1.5 bg-indigo-500/10 rounded-lg">03</span>
            <h3>Event Ialah &quot;Context Engine&quot;</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Apabila QR discan, backend menentukan event mana yang sedang <strong className="text-emerald-400">OPEN</strong>. Lifecycle event:
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
            <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
              OPEN<br/><span className="text-[9px] font-sans font-normal">Merekod imbasan</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400">
              CLOSED<br/><span className="text-[9px] font-sans font-normal">Pendaftaran ditutup</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-800 text-slate-500">
              ARCHIVED<br/><span className="text-[9px] font-sans font-normal">Arkib sejarah</span>
            </div>
          </div>
        </div>

        {/* Principle 5 & 11 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
            <span className="p-1.5 bg-indigo-500/10 rounded-lg">04</span>
            <h3>Scanner Bukan Database (Client Ringan)</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Pengimbas hanyalah client UI interface untuk membaca QR, hantar ke API backend, dan paparkan feedback visual & audio. Scanner tidak menyimpan pangkalan data secara langsung.
          </p>
          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700 text-[11px] text-slate-300 flex justify-between items-center font-mono">
            <span>Camera &rarr; QR Detect &rarr; API &rarr; Backend Validation</span>
          </div>
        </div>

        {/* Principle 6 & 7 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md md:col-span-2">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
            <span className="p-1.5 bg-indigo-500/10 rounded-lg">05</span>
            <h3>Aliran Pengesahan (Flow Scan) & Pengesanan Duplicate</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5 bg-slate-800/50 p-3.5 rounded-xl border border-slate-700">
              <div className="font-bold text-white mb-1">Langkah Validasi Backend:</div>
              <div className="text-slate-300 font-mono text-[11px] space-y-1">
                <div>1. Extract StaffID daripada QR</div>
                <div>2. Semak Active Event (OPEN?)</div>
                <div>3. Semak Staf wujud dalam Pangkalan Staf Master</div>
                <div>4. Semak Duplicate (<code className="text-amber-400">StaffID + EventID</code>)</div>
                <div>5. Simpan Transaksi Kehadiran</div>
              </div>
            </div>

            <div className="space-y-2 bg-slate-800/50 p-3.5 rounded-xl border border-slate-700">
              <div className="font-bold text-white mb-1">Feedback Maklum Balas Pengguna:</div>
              <div className="space-y-1 text-[11px]">
                <div className="text-emerald-400 font-bold">✓ KEHADIRAN DIREKOD (Success Chime)</div>
                <div className="text-amber-400 font-bold">⚠ SUDAH DIREKOD (Double Warning Beep)</div>
                <div className="text-rose-400 font-bold">✕ TIADA EVENT AKTIF / QR TIDAK SAH (Error Buzzer)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Principle 14 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md md:col-span-2">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
            <span className="p-1.5 bg-indigo-500/10 rounded-lg">06</span>
            <h3>Falsafah: &quot;Operator Tidak Perlu Fikir Sistem&quot;</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Operator bertugas hanya perlu melaksanakan 5 langkah mudah tanpa perlu risau pangkalan data, query, atau jadual:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-semibold">
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white">1. Buka Event</div>
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white">2. Buka Scanner</div>
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white">3. Scan QR</div>
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white">4. Lihat Result</div>
            <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white">5. Tutup Event</div>
          </div>
        </div>
      </div>
    </div>
  );
};
