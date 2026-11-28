import React, { useEffect, useState } from 'react';
import { Settings, Users, TabletSmartphone, UserPlus, Trash2, CheckCircle2, Ban } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useInstitution } from '../contexts/InstitutionContext';
import { attendanceEngine } from '../services/attendanceEngine';
import { InstitutionMember, InstitutionRole, ScannerDevice } from '../types';
import { formatDisplayName } from '../utils/staffUtils';

export const InstitutionSettingsView: React.FC = () => {
  const { user, isPlatformOwner } = useAuth();
  const {
    activeInstitutionId,
    activeInstitution,
    activeSettings,
    isInstitutionAdmin,
    assignInstitutionMember,
    revokeInstitutionMember,
    updateInstitutionSettings
  } = useInstitution();

  const [members, setMembers] = useState<InstitutionMember[]>([]);
  const [devices, setDevices] = useState<ScannerDevice[]>([]);

  const [settingsForm, setSettingsForm] = useState({
    defaultEmailDomain: '',
    avatarBaseUrl: '',
    qrPrefix: 'STAFF',
    allowManualOverride: true,
    requireAuthorizedDevice: false,
    timezone: 'Asia/Kuala_Lumpur'
  });

  const [memberForm, setMemberForm] = useState({
    uid: '',
    email: '',
    displayName: '',
    role: 'OPERATOR' as InstitutionRole
  });

  const [deviceLabel, setDeviceLabel] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (activeSettings) {
      setSettingsForm({
        defaultEmailDomain: activeSettings.defaultEmailDomain || '',
        avatarBaseUrl: activeSettings.avatarBaseUrl || '',
        qrPrefix: activeSettings.qrPrefix || 'STAFF',
        allowManualOverride: activeSettings.allowManualOverride,
        requireAuthorizedDevice: activeSettings.requireAuthorizedDevice,
        timezone: activeSettings.timezone || 'Asia/Kuala_Lumpur'
      });
    }
  }, [activeSettings]);

  useEffect(() => {
    if (!activeInstitutionId || (!isInstitutionAdmin && !isPlatformOwner)) {
      setMembers([]);
      setDevices([]);
      return;
    }

    const unsubMembers = attendanceEngine.subscribeMembers(activeInstitutionId, setMembers);
    const unsubDevices = attendanceEngine.subscribeScannerDevices(activeInstitutionId, setDevices);
    return () => {
      unsubMembers();
      unsubDevices();
    };
  }, [activeInstitutionId, isInstitutionAdmin, isPlatformOwner]);

  if (!activeInstitutionId || !activeInstitution) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400">
        Tiada institusi aktif dipilih.
      </div>
    );
  }

  if (!isInstitutionAdmin && !isPlatformOwner) {
    return (
      <div className="p-6 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-xs text-rose-200">
        Hanya Pentadbir Institusi (`INSTITUTION_ADMIN`) boleh mengubah tetapan, ahli, dan peranti pengimbas institusi.
      </div>
    );
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateInstitutionSettings(settingsForm);
    setNotice('Tetapan institusi berjaya disimpan.');
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await assignInstitutionMember({
      institutionId: activeInstitutionId,
      ...memberForm
    });
    setMemberForm({ uid: '', email: '', displayName: '', role: 'OPERATOR' });
    setNotice('Ahli institusi berjaya dikemaskini.');
  };

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !deviceLabel.trim()) return;
    await attendanceEngine.registerScannerDevice(activeInstitutionId, deviceLabel, user.uid);
    setDeviceLabel('');
    setNotice('Peranti pengimbas baharu didaftarkan.');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-lg">
        <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase">
          Tenant Administration
        </span>
        <h2 className="text-xl font-bold mt-1">{activeInstitution.name}</h2>
        <p className="text-xs text-slate-400">
          Tetapan institusi, pengurusan peranan ahli (Admin/Operator/Viewer), dan peranti pengimbas sah.
        </p>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Institution Settings */}
      <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Settings className="w-4 h-4 text-indigo-400" />
          <span>Tetapan Polisi & Penjenamaan Institusi</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-slate-400 mb-1">Awalan QR Staf (Kekal)</label>
            <input
              type="text"
              required
              value={settingsForm.qrPrefix}
              onChange={(e) => setSettingsForm({ ...settingsForm, qrPrefix: e.target.value.toUpperCase() })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Domain Emel Lalai CSV</label>
            <input
              type="text"
              placeholder="e.g. institusi.edu.my"
              value={settingsForm.defaultEmailDomain}
              onChange={(e) => setSettingsForm({ ...settingsForm, defaultEmailDomain: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Zon Masa</label>
            <input
              type="text"
              value={settingsForm.timezone}
              onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">URL Asas Avatar Staf (Pilihan)</label>
          <input
            type="url"
            placeholder="https://.../avatar-folder"
            value={settingsForm.avatarBaseUrl}
            onChange={(e) => setSettingsForm({ ...settingsForm, avatarBaseUrl: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
          />
        </div>

        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={settingsForm.allowManualOverride}
              onChange={(e) => setSettingsForm({ ...settingsForm, allowManualOverride: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700"
            />
            <span>Benarkan Admin Simulasi / Manual Override</span>
          </label>

          <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={settingsForm.requireAuthorizedDevice}
              onChange={(e) => setSettingsForm({ ...settingsForm, requireAuthorizedDevice: e.target.checked })}
              className="rounded bg-slate-800 border-slate-700"
            />
            <span>Wajibkan Peranti Pengimbas Berdaftar</span>
          </label>
        </div>

        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl cursor-pointer"
        >
          Simpan Tetapan
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Ahli & Peranan Institusi ({members.length})</span>
          </h3>

          <form onSubmit={handleAddMember} className="space-y-2.5 p-3 bg-slate-800/50 rounded-xl border border-slate-700/60">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                placeholder="Firebase UID *"
                value={memberForm.uid}
                onChange={(e) => setMemberForm({ ...memberForm, uid: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
              <select
                value={memberForm.role}
                onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as InstitutionRole })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="INSTITUTION_ADMIN">INSTITUTION_ADMIN</option>
                <option value="OPERATOR">OPERATOR</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="email"
                required
                placeholder="Emel Google *"
                value={memberForm.email}
                onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
              <input
                type="text"
                required
                placeholder="Nama *"
                value={memberForm.displayName}
                onChange={(e) => setMemberForm({ ...memberForm, displayName: e.target.value })}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Tambah / Kemaskini Ahli</span>
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {members.map((m) => (
              <div key={m.uid} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-2">
                <div className="overflow-hidden">
                  <div className="font-bold text-white truncate">{formatDisplayName(m.displayName)}</div>
                  <div className="text-[10px] text-slate-400 truncate">{m.email}</div>
                  <div className="text-[10px] font-mono text-indigo-300">{m.role} • {m.status}</div>
                </div>
                {m.status === 'ACTIVE' && m.uid !== user?.uid && (
                  <button
                    onClick={() => revokeInstitutionMember(activeInstitutionId, m.uid)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer"
                    title="Tarik balik akses"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scanner Devices Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <TabletSmartphone className="w-4 h-4 text-indigo-400" />
            <span>Peranti Pengimbas Sah ({devices.length})</span>
          </h3>

          <form onSubmit={handleRegisterDevice} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Label Peranti (e.g. Kiosk Dewan Utama)"
              value={deviceLabel}
              onChange={(e) => setDeviceLabel(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2 rounded-xl cursor-pointer"
            >
              Daftar
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {devices.length === 0 ? (
              <div className="p-4 text-center text-slate-500">Tiada peranti pengimbas didaftarkan.</div>
            ) : (
              devices.map((dev) => (
                <div key={dev.id} className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">{dev.label}</div>
                    <div className="text-[10px] font-mono text-slate-400">{dev.id} • {dev.status}</div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() =>
                        attendanceEngine.setScannerDeviceStatus(
                          activeInstitutionId,
                          dev.id,
                          dev.status === 'ACTIVE' ? 'REVOKED' : 'ACTIVE'
                        )
                      }
                      className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] text-white cursor-pointer"
                    >
                      {dev.status === 'ACTIVE' ? 'Revoke' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => attendanceEngine.deleteScannerDevice(activeInstitutionId, dev.id)}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
