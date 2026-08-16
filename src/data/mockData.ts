import { Staff, EventItem, AttendanceRecord } from '../types';
import { buildStaffImageUrl } from '../utils/staffUtils';

export const INITIAL_STAFF: Staff[] = [];

export const INITIAL_EVENTS: EventItem[] = [
  {
    id: 'E001',
    name: 'Mesyuarat Staf & Pensyarah Bil. 3/2026',
    category: 'Mesyuarat',
    date: '2026-08-08',
    startTime: '09:00',
    endTime: '12:00',
    location: 'Dewan Gemilang Utama',
    status: 'OPEN',
    description: 'Mesyuarat berkala bagi membincangkan perancangan akademik semester dan bajet tahunan.',
    targetCount: 15,
    createdAt: '2026-08-08T08:00:00.000Z'
  },
  {
    id: 'E002',
    name: 'Bengkel Keselamatan Cyber & Integriti Data',
    category: 'Kursus',
    date: '2026-08-05',
    startTime: '10:00',
    endTime: '16:00',
    location: 'Makmal Komputer 4',
    status: 'CLOSED',
    description: 'Sesi latihan amalan terbaik keselamatan siber untuk semua kakitangan.',
    targetCount: 20,
    createdAt: '2026-08-04T08:00:00.000Z'
  },
  {
    id: 'E003',
    name: 'Taklimat Pengurusan Sistem Kehadiran Baharu',
    category: 'Taklimat',
    date: '2026-08-01',
    startTime: '14:30',
    endTime: '16:30',
    location: 'Bilik Seminar A',
    status: 'ARCHIVED',
    description: 'Taklimat pelaksanaan sistem pengurusan kehadiran berasaskan QR permanent.',
    targetCount: 25,
    createdAt: '2026-07-30T08:00:00.000Z'
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
