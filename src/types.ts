export type EventStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';

export type EventCategory = 'Mesyuarat' | 'Program' | 'Kursus' | 'Taklimat' | 'Aktiviti' | 'Lain-lain';

export interface Staff {
  id: string; // Primary key e.g. "ST001"
  name: string;
  department: string;
  position: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface EventItem {
  id: string; // Primary key e.g. "E001"
  name: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  status: EventStatus;
  description?: string;
  targetCount?: number;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string; // e.g. "ATT-123456"
  eventId: string;
  eventName: string;
  staffId: string;
  staffName: string;
  staffDepartment: string;
  timestamp: string; // ISO string
  formattedTime: string; // e.g. "10:02 AM"
  method: 'CAMERA_SCAN' | 'SIMULATOR' | 'MANUAL_OVERRIDE';
}

export type ScanStatus = 
  | 'SUCCESS' 
  | 'DUPLICATE' 
  | 'NO_ACTIVE_EVENT' 
  | 'INVALID_QR' 
  | 'STAFF_NOT_FOUND';

export interface ScanResult {
  status: ScanStatus;
  title: string;
  message: string;
  staff?: Staff;
  event?: EventItem;
  timestamp?: string;
  existingRecord?: AttendanceRecord;
}

export type ActiveTab = 'dashboard' | 'scanner' | 'events' | 'staff' | 'reports' | 'concept';
