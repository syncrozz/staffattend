import React, { useState } from 'react';
import {
  Plus,
  Lock,
  Archive,
  Clock,
  MapPin,
  Search,
  Eye
} from 'lucide-react';
import { EventItem, EventStatus, EventCategory, AttendanceRecord } from '../types';
import { formatDisplayName } from '../utils/staffUtils';

interface EventManagementViewProps {
  events: EventItem[];
  attendanceRecords: AttendanceRecord[];
  isInstitutionAdmin: boolean;
  canScan: boolean;
  onSetEventStatus: (eventId: string, newStatus: EventStatus) => Promise<void>;
  onCreateEvent: (
    newEvent: Omit<EventItem, 'id' | 'institutionId' | 'createdAt' | 'updatedAt' | 'createdByUid'>
  ) => Promise<void>;
  onOpenScannerForEvent: (eventId: string) => void;
}

export const EventManagementView: React.FC<EventManagementViewProps> = ({
  events,
  attendanceRecords,
  isInstitutionAdmin,
  canScan,
  onSetEventStatus,
  onCreateEvent,
  onOpenScannerForEvent
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | EventStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<EventItem | null>(null);

  // New Event Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Mesyuarat' as EventCategory,
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '12:00',
    location: 'Dewan Utama',
    description: '',
    targetCount: 20
  });

  const filteredEvents = events.filter((e) => {
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSubmitNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInstitutionAdmin || !formData.name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onCreateEvent({
        name: formData.name.trim(),
        category: formData.category,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        location: formData.location.trim() || 'Dewan Utama',
        status: 'OPEN',
        description: formData.description.trim(),
        targetCount: Number(formData.targetCount) || 15
      });

      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        category: 'Mesyuarat',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '12:00',
        location: 'Dewan Utama',
        description: '',
        targetCount: 20
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleEventStatus = async (eventId: string, newStatus: EventStatus) => {
    if (!isInstitutionAdmin || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSetEventStatus(eventId, newStatus);
      if (newStatus === 'OPEN' && canScan) {
        onOpenScannerForEvent(eventId);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="event-management-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Context Engine
            </span>
            <span className="text-slate-400 text-xs">Lifecycle: OPEN &rarr; CLOSED &rarr; ARCHIVED</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-1">
            Pengurusan Acara & Program (Events)
          </h2>
          <p className="text-xs text-slate-400">
            Event menentukan konteks kehadiran. Hanya event berstatus <span className="text-emerald-400 font-bold">OPEN</span> akan merekod imbasan QR.
          </p>
        </div>

        {isInstitutionAdmin ? (
          <button
            id="event-create-new-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer whitespace-nowrap w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 flex-shrink-0" />
            <span>Tambah Acara Baharu</span>
          </button>
        ) : (
          <div className="inline-flex items-center space-x-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-xs px-3 py-2 rounded-xl">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Mod Bacaan Sahaja (Perlu Peranan Admin)</span>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          {(['ALL', 'OPEN', 'CLOSED', 'ARCHIVED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {st === 'ALL'
                ? 'Semua Event'
                : st === 'OPEN'
                ? 'Aktif (OPEN)'
                : st === 'CLOSED'
                ? 'Ditutup (CLOSED)'
                : 'Arkib (ARCHIVED)'}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Cari acara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 text-white text-xs pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Events List Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-xs text-slate-500">
          Tiada acara ditemui untuk institusi ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => {
            const eventAttendees = attendanceRecords.filter((r) => r.eventId === event.id);
            const attendeeCount = eventAttendees.length;

            return (
              <div
                key={event.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-4 ${
                  event.status === 'OPEN'
                    ? 'border-emerald-500/50 shadow-emerald-950/20'
                    : event.status === 'CLOSED'
                    ? 'border-slate-800'
                    : 'border-slate-800/60 opacity-85'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                      ID: {event.id}
                    </span>

                    {event.status === 'OPEN' ? (
                      <span className="bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>OPEN (AKTIF)</span>
                      </span>
                    ) : event.status === 'CLOSED' ? (
                      <span className="bg-slate-800 text-slate-400 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                        <Lock className="w-3 h-3" />
                        <span>CLOSED</span>
                      </span>
                    ) : (
                      <span className="bg-slate-800/80 text-slate-500 font-bold text-[10px] px-2.5 py-0.5 rounded-full flex items-center space-x-1">
                        <Archive className="w-3 h-3" />
                        <span>ARCHIVED</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-base leading-snug line-clamp-2">
                      {event.name}
                    </h3>
                    <span className="inline-block mt-1 bg-indigo-500/10 text-indigo-300 text-[10px] font-medium px-2 py-0.5 rounded border border-indigo-500/20">
                      {event.category}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>
                        {event.date} • {event.startTime} - {event.endTime}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{event.location}</span>
                    </div>
                  </div>

                  {/* Attendees counter */}
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Rekod Kehadiran:</span>
                      <span className="text-white font-bold font-mono">
                        {attendeeCount} / {event.targetCount || '-'} orang
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((attendeeCount / (event.targetCount || 1)) * 100))}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Status Toggle & Detail Actions */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedEventForDetail(event)}
                    className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1"
                    title="Lihat senarai peserta"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Senarai</span>
                  </button>

                  {isInstitutionAdmin && (
                    <div className="flex items-center space-x-1">
                      {event.status !== 'OPEN' ? (
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleToggleEventStatus(event.id, 'OPEN')}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                        >
                          Buka (OPEN)
                        </button>
                      ) : (
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleToggleEventStatus(event.id, 'CLOSED')}
                          className="bg-slate-800 hover:bg-rose-950 disabled:opacity-50 text-rose-300 font-medium text-xs px-3 py-1.5 rounded-xl transition-colors border border-slate-700 cursor-pointer"
                        >
                          Tutup (CLOSE)
                        </button>
                      )}

                      {event.status === 'CLOSED' && (
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleToggleEventStatus(event.id, 'ARCHIVED')}
                          className="p-1.5 text-slate-500 hover:text-slate-300 bg-slate-800/60 rounded-xl cursor-pointer"
                          title="Arkibkan event"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create New Event */}
      {isCreateModalOpen && isInstitutionAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-white">
            <h3 className="text-lg font-bold">Tambah Acara / Program Baharu</h3>

            <form onSubmit={handleSubmitNewEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nama Acara / Program *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mesyuarat Agung Tahunan 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as EventCategory })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Mesyuarat">Mesyuarat</option>
                    <option value="Program">Program</option>
                    <option value="Kursus">Kursus</option>
                    <option value="Taklimat">Taklimat</option>
                    <option value="Aktiviti">Aktiviti</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Tarikh *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Masa Mula</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Masa Tamat</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Lokasi Acara</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dewan Gemilang / Bilik Mesyuarat A"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Sasaran Jumlah Peserta</label>
                <input
                  type="number"
                  min={1}
                  value={formData.targetCount}
                  onChange={(e) => setFormData({ ...formData, targetCount: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-slate-800 text-slate-300 font-medium px-4 py-2 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer"
                >
                  Simpan & Buka Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Event Detail Attendee List */}
      {selectedEventForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base">{selectedEventForDetail.name}</h3>
                <p className="text-xs text-slate-400">
                  {selectedEventForDetail.date} • {selectedEventForDetail.location}
                </p>
              </div>
              <button
                onClick={() => setSelectedEventForDetail(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              <h4 className="text-xs font-bold text-indigo-400">Senarai Peserta Hadir:</h4>
              {attendanceRecords.filter((r) => r.eventId === selectedEventForDetail.id).length > 0 ? (
                attendanceRecords
                  .filter((r) => r.eventId === selectedEventForDetail.id)
                  .map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-white">{formatDisplayName(rec.staffName)}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {rec.staffId} • {rec.staffDepartment}
                        </div>
                      </div>
                      <span className="text-emerald-400 font-mono text-[11px] bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        {rec.formattedTime}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Belum ada peserta yang mengimbas kehadiran.
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedEventForDetail(null)}
                className="bg-indigo-600 text-white font-medium text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
