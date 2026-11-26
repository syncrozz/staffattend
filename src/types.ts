export type EventStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';

export type EventCategory = 'Mesyuarat' | 'Program' | 'Kursus' | 'Taklimat' | 'Aktiviti' | 'Lain-lain';

export type InstitutionRole = 'INSTITUTION_ADMIN' | 'OPERATOR' | 'VIEWER';

export type ScanMethod = 'CAMERA_SCAN' | 'SIMULATOR' | 'MANUAL_OVERRIDE' | 'KIOSK_SCAN';

export interface PlatformOwner {
  uid: string;
  email: string;
  displayName: string;
  role: 'PLATFORM_OWNER';
  status: 'ACTIVE';
  createdAt: string;
  lastLoginAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  updatedAt: string;
}

export interface UserMembershipSummary {
  uid: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  role: InstitutionRole;
  status: 'ACTIVE' | 'REVOKED';
  updatedAt: string;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  domain?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionSettings {
  institutionId: string;
  defaultEmailDomain?: string;
  avatarBaseUrl?: string;
  qrPrefix: string;
  allowManualOverride: boolean;
  requireAuthorizedDevice: boolean;
  timezone: string;
  updatedByUid: string;
  updatedAt: string;
}

export interface InstitutionMember {
  uid: string;
  institutionId: string;
  email: string;
  displayName: string;
  role: InstitutionRole;
  status: 'ACTIVE' | 'REVOKED';
  assignedByUid: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScannerDevice {
  id: string;
  institutionId: string;
  label: string;
  status: 'ACTIVE' | 'REVOKED';
  registeredByUid: string;
  createdAt: string;
  lastSeenAt?: string;
}

export interface Staff {
  id: string; // Primary key e.g. "ST001"
  institutionId: string;
  name: string;
  department: string;
  position: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  updatedByUid?: string;
  updatedAt?: string;
}

export interface EventItem {
  id: string;
  institutionId: string;
  name: string;
  category: EventCategory;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  location: string;
  status: EventStatus;
  description?: string;
  targetCount?: number;
  createdByUid?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string; // Deterministic "{eventId}__{staffId}"
  institutionId: string;
  eventId: string;
  eventName: string;
  staffId: string;
  staffName: string;
  staffDepartment: string;
  timestamp: string; // ISO string normalized from Firestore Timestamp
  formattedTime: string; // e.g. "10:02 AM"
  method: ScanMethod;
  scannerDeviceId?: string;
  recordedByUid?: string;
}

export type ScanStatus =
  | 'SUCCESS'
  | 'DUPLICATE'
  | 'NO_ACTIVE_EVENT'
  | 'INVALID_QR'
  | 'STAFF_NOT_FOUND'
  | 'STAFF_INACTIVE'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR';

export interface ScanResult {
  status: ScanStatus;
  title: string;
  message: string;
  staff?: Staff;
  event?: EventItem;
  timestamp?: string;
  existingRecord?: AttendanceRecord;
}

export type ActiveTab =
  | 'dashboard'
  | 'scanner'
  | 'events'
  | 'staff'
  | 'reports'
  | 'concept'
  | 'institution'
  | 'platform';
