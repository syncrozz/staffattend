import React, { useState } from 'react';
import {
  Building2,
  Plus,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
  Ban,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useInstitution } from '../contexts/InstitutionContext';
import { InstitutionRole } from '../types';

interface PlatformAdminViewProps {
  onEnterInstitutionDashboard: () => void;
}

export const PlatformAdminView: React.FC<PlatformAdminViewProps> = ({
  onEnterInstitutionDashboard
}) => {
  const { platformOwner, isPlatformOwner } = useAuth();
  const {
    allInstitutions,
    activeInstitutionId,
    selectInstitution,
    createInstitution,
    toggleInstitutionStatus,
    assignInstitutionMember
  } = useInstitution();

  const [instForm, setInstForm] = useState({
    name: '',
    code: '',
    domain: '',
    defaultEmailDomain: '',
    avatarBaseUrl: ''
  });
  const [memberForm, setMemberForm] = useState({
    institutionId: activeInstitutionId || '',
    uid: '',
    email: '',
    displayName: '',
    role: 'INSTITUTION_ADMIN' as InstitutionRole
  });
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isPlatformOwner || !platformOwner) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-xs text-rose-200">
        Akses ditolak: Hanya Platform Owner yang disahkan oleh Firestore boleh mengakses konsol ini.
      </div>
    );
  }

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const id = await createInstitution(instForm);
      setStatusMsg(`Institusi "${instForm.name}" (${id}) berjaya diwujudkan.`);
      setInstForm({ name: '', code: '', domain: '', defaultEmailDomain: '', avatarBaseUrl: '' });
      setMemberForm((prev) => ({ ...prev, institutionId: id }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mencipta institusi.');
    } finally {
      setBusy(false);
    }
  };

  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    const targetInstId = memberForm.institutionId || activeInstitutionId || allInstitutions[0]?.id;
    if (!targetInstId) {
      setErrorMsg('Sila pilih institusi sasaran terlebih dahulu.');
      return;
    }
    setBusy(true);
    try {
      await assignInstitutionMember({
        ...memberForm,
        institutionId: targetInstId
      });
      setStatusMsg(`Keahlian ${memberForm.email} (${memberForm.role}) berjaya didaftarkan pada ${targetInstId}.`);
      setMemberForm((prev) => ({ ...prev, uid: '', email: '', displayName: '' }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mendaftar ahli institusi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              Platform Owner Console
            </span>
            <span className="text-xs text-emerald-400 font-mono">UID: {platformOwner.uid}</span>
          </div>
          <h2 className="text-xl font-bold">Pengurusan Platform & Multi-Institusi</h2>
          <p className="text-xs text-slate-400">
            Disahkan sebagai Platform Owner ({platformOwner.email}). Urus institusi dan lantikan pentadbir institusi.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Institution */}
        <form onSubmit={handleCreateInstitution} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Wujudkan Institusi Baharu</span>
          </h3>
          <div>
            <label className="block text-slate-400 mb-1">Nama Institusi *</label>
            <input
              type="text"
              required
              placeholder="e.g. Kolej Profesional MARA Bandar Penawar"
              value={instForm.name}
              onChange={(e) => setInstForm({ ...instForm, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Kod Unik (A-Z / 0-9) *</label>
              <input
                type="text"
                required
                placeholder="e.g. KPMBP"
                value={instForm.code}
                onChange={(e) => setInstForm({ ...instForm, code: e.target.value.toUpperCase() })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Domain Rasmi</label>
              <input
                type="text"
                placeholder="e.g. bpenawar.kpm.edu.my"
                value={instForm.domain}
                onChange={(e) => setInstForm({ ...instForm, domain: e.target.value, defaultEmailDomain: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">URL Asas Avatar Staf (Pilihan)</label>
            <input
              type="url"
              placeholder="https://.../Gambar%20Staff"
              value={instForm.avatarBaseUrl}
              onChange={(e) => setInstForm({ ...instForm, avatarBaseUrl: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer"
          >
            Cipta Institusi
          </button>
        </form>

        {/* Assign Institution Member */}
        <form onSubmit={handleAssignMember} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Lantik Pentadbir / Ahli Institusi</span>
          </h3>
          <div>
            <label className="block text-slate-400 mb-1">Institusi Sasaran *</label>
            <select
              value={memberForm.institutionId || activeInstitutionId || ''}
              onChange={(e) => setMemberForm({ ...memberForm, institutionId: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            >
              <option value="">Pilih institusi...</option>
              {allInstitutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} ({inst.code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Firebase UID Pengguna *</label>
              <input
                type="text"
                required
                placeholder="UID daripada skrin Pending Access"
                value={memberForm.uid}
                onChange={(e) => setMemberForm({ ...memberForm, uid: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Peranan *</label>
              <select
                value={memberForm.role}
                onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as InstitutionRole })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="INSTITUTION_ADMIN">INSTITUTION_ADMIN</option>
                <option value="OPERATOR">OPERATOR</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Emel Google *</label>
              <input
                type="email"
                required
                placeholder="admin@institusi.edu.my"
                value={memberForm.email}
                onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Nama Paparan *</label>
              <input
                type="text"
                required
                placeholder="Nama Pentadbir"
                value={memberForm.displayName}
                onChange={(e) => setMemberForm({ ...memberForm, displayName: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl cursor-pointer"
          >
            Simpan Keahlian Institusi
          </button>
        </form>
      </div>

      {/* Institutions Directory */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span>Senarai Institusi Berdaftar ({allInstitutions.length})</span>
        </h3>

        {allInstitutions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Tiada institusi dicipta lagi. Gunakan borang di atas untuk mewujudkan institusi pertama.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allInstitutions.map((inst) => {
              const isSelected = inst.id === activeInstitutionId;
              return (
                <div
                  key={inst.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    isSelected ? 'bg-indigo-950/30 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                      {inst.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inst.status === 'ACTIVE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-950 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {inst.status}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white">{inst.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">ID: {inst.id}</div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        selectInstitution(inst.id);
                        onEnterInstitutionDashboard();
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <span>Buka</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        toggleInstitutionStatus(inst.id, inst.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')
                      }
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
                      title={inst.status === 'ACTIVE' ? 'Gantung Institusi' : 'Aktifkan Semula'}
                    >
                      {inst.status === 'ACTIVE' ? (
                        <Ban className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
