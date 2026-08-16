import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from './firebase';
import { Staff, EventItem, AttendanceRecord, ScanResult, EventStatus } from '../types';
import { INITIAL_STAFF, INITIAL_EVENTS, INITIAL_ATTENDANCE } from '../data/mockData';
import { soundService } from './soundService';

const STORAGE_KEYS = {
  STAFF: 'event_attendance_staff_v1',
  EVENTS: 'event_attendance_events_v1',
  RECORDS: 'event_attendance_records_v1'
};

const DUMMY_STAFF_NAMES = new Set([
  'Dr. Ahmad Hafiz bin Zulkifli',
  'Nurul Ain binti Hassan',
  'Muhammadd Razif bin Ismail',
  'Prof. Madya Dr. Sarah binti Othman',
  'Khairul Anuar bin Osman',
  'Siti Aminah binti Yusof',
  'Azman bin Ariffin',
  'Farah Nadia binti Rosli'
]);

class AttendanceEngine {
  private staffCache: Staff[] = [];
  private eventsCache: EventItem[] = [];
  private recordsCache: AttendanceRecord[] = [];
  private isInitialized = false;

  private staffSubscribers: Array<(staff: Staff[]) => void> = [];
  private eventsSubscribers: Array<(events: EventItem[]) => void> = [];
  private recordsSubscribers: Array<(records: AttendanceRecord[]) => void> = [];

  constructor() {
    this.initFirestoreListeners();
  }

  // Set up real-time listeners to Firestore collections
  private async initFirestoreListeners() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // 1. Staff Collection Listener
    const staffColRef = collection(db, 'staff');
    onSnapshot(staffColRef, async (snapshot) => {
      const staffList: Staff[] = [];
      const dummyDocIds: string[] = [];

      snapshot.forEach((docSnap) => {
        const s = docSnap.data() as Staff;
        if (DUMMY_STAFF_NAMES.has(s.name) || (s.email && s.email.endsWith('@institut.edu.my') && s.id.startsWith('ST00'))) {
          dummyDocIds.push(docSnap.id);
        } else {
          staffList.push(s);
        }
      });

      // Delete dummy staff docs from Firestore
      if (dummyDocIds.length > 0) {
        dummyDocIds.forEach((id) => {
          deleteDoc(doc(db, 'staff', id)).catch(() => {});
        });
      }

      this.staffCache = staffList;
      this.saveToLocalStorage(STORAGE_KEYS.STAFF, staffList);
      this.notifyStaffSubscribers();
    }, (error) => {
      console.warn('Firestore staff listener error:', error);
      // Fallback to localStorage filtering dummy staff
      const stored = this.getLocalStorage<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
      this.staffCache = stored.filter((s) => !DUMMY_STAFF_NAMES.has(s.name));
      this.notifyStaffSubscribers();
    });

    // 2. Events Collection Listener
    const eventsColRef = collection(db, 'events');
    onSnapshot(eventsColRef, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial events if empty
        await this.seedInitialEvents();
      } else {
        const eventsList: EventItem[] = [];
        snapshot.forEach((docSnap) => {
          eventsList.push(docSnap.data() as EventItem);
        });
        // Sort events by date / creation
        eventsList.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        this.eventsCache = eventsList;
        this.saveToLocalStorage(STORAGE_KEYS.EVENTS, eventsList);
        this.notifyEventsSubscribers();
      }
    }, (error) => {
      console.warn('Firestore events listener error:', error);
      this.eventsCache = this.getLocalStorage<EventItem[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
      this.notifyEventsSubscribers();
    });

    // 3. Attendance Records Collection Listener
    const recordsColRef = collection(db, 'attendanceRecords');
    onSnapshot(recordsColRef, async (snapshot) => {
      const recordsList: AttendanceRecord[] = [];
      const dummyRecordIds: string[] = [];

      snapshot.forEach((docSnap) => {
        const r = docSnap.data() as AttendanceRecord;
        if (DUMMY_STAFF_NAMES.has(r.staffName) || docSnap.id.startsWith('ATT-100')) {
          dummyRecordIds.push(docSnap.id);
        } else {
          recordsList.push(r);
        }
      });

      if (dummyRecordIds.length > 0) {
        dummyRecordIds.forEach((id) => {
          deleteDoc(doc(db, 'attendanceRecords', id)).catch(() => {});
        });
      }

      recordsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      this.recordsCache = recordsList;
      this.saveToLocalStorage(STORAGE_KEYS.RECORDS, recordsList);
      this.notifyRecordsSubscribers();
    }, (error) => {
      console.warn('Firestore records listener error:', error);
      const stored = this.getLocalStorage<AttendanceRecord[]>(STORAGE_KEYS.RECORDS, INITIAL_ATTENDANCE);
      this.recordsCache = stored.filter((r) => !DUMMY_STAFF_NAMES.has(r.staffName));
      this.notifyRecordsSubscribers();
    });
  }

  // Seed functions for initial Firestore data
  private async seedInitialStaff() {
    try {
      const batch = writeBatch(db);
      INITIAL_STAFF.forEach((s) => {
        const ref = doc(db, 'staff', s.id);
        batch.set(ref, sanitizeForFirestore(s));
      });
      await batch.commit();
    } catch (e) {
      console.error('Failed to seed initial staff to Firestore:', e);
    }
  }

  private async seedInitialEvents() {
    try {
      const batch = writeBatch(db);
      INITIAL_EVENTS.forEach((e) => {
        const ref = doc(db, 'events', e.id);
        batch.set(ref, sanitizeForFirestore(e));
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to seed initial events to Firestore:', err);
    }
  }

  private async seedInitialAttendance() {
    try {
      const batch = writeBatch(db);
      INITIAL_ATTENDANCE.forEach((r) => {
        const ref = doc(db, 'attendanceRecords', r.id);
        batch.set(ref, sanitizeForFirestore(r));
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to seed initial attendance to Firestore:', err);
    }
  }

  // Helper for localStorage
  private getLocalStorage<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private saveToLocalStorage(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }

  // Subscriptions for React components
  public subscribeStaff(callback: (staff: Staff[]) => void): () => void {
    this.staffSubscribers.push(callback);
    callback(this.getStaffList());
    return () => {
      this.staffSubscribers = this.staffSubscribers.filter((cb) => cb !== callback);
    };
  }

  public subscribeEvents(callback: (events: EventItem[]) => void): () => void {
    this.eventsSubscribers.push(callback);
    callback(this.getEvents());
    return () => {
      this.eventsSubscribers = this.eventsSubscribers.filter((cb) => cb !== callback);
    };
  }

  public subscribeRecords(callback: (records: AttendanceRecord[]) => void): () => void {
    this.recordsSubscribers.push(callback);
    callback(this.getAttendanceRecords());
    return () => {
      this.recordsSubscribers = this.recordsSubscribers.filter((cb) => cb !== callback);
    };
  }

  private notifyStaffSubscribers() {
    this.staffSubscribers.forEach((cb) => cb(this.staffCache));
  }

  private notifyEventsSubscribers() {
    this.eventsSubscribers.forEach((cb) => cb(this.eventsCache));
  }

  private notifyRecordsSubscribers() {
    this.recordsSubscribers.forEach((cb) => cb(this.recordsCache));
  }

  // Synchronous Getters (from active cache or localStorage)
  public getStaffList(): Staff[] {
    if (this.staffCache.length > 0) return this.staffCache;
    return this.getLocalStorage<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
  }

  public getEvents(): EventItem[] {
    if (this.eventsCache.length > 0) return this.eventsCache;
    return this.getLocalStorage<EventItem[]>(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
  }

  public getAttendanceRecords(): AttendanceRecord[] {
    if (this.recordsCache.length > 0) return this.recordsCache;
    return this.getLocalStorage<AttendanceRecord[]>(STORAGE_KEYS.RECORDS, INITIAL_ATTENDANCE);
  }

  // Save / Sync Staff
  public async addStaff(staff: Staff): Promise<void> {
    try {
      const docRef = doc(db, 'staff', staff.id);
      await setDoc(docRef, sanitizeForFirestore(staff));
    } catch (e) {
      console.error('Error adding staff to Firestore:', e);
    }
    // Update local cache
    this.staffCache = [staff, ...this.staffCache.filter((s) => s.id !== staff.id)];
    this.saveToLocalStorage(STORAGE_KEYS.STAFF, this.staffCache);
    this.notifyStaffSubscribers();
  }

  public async saveStaffList(staffList: Staff[]): Promise<void> {
    this.staffCache = staffList;
    this.saveToLocalStorage(STORAGE_KEYS.STAFF, staffList);
    this.notifyStaffSubscribers();

    try {
      const snap = await getDocs(collection(db, 'staff'));
      const newStaffIds = new Set(staffList.map((s) => s.id));
      const batch = writeBatch(db);

      snap.forEach((docSnap) => {
        if (!newStaffIds.has(docSnap.id)) {
          batch.delete(docSnap.ref);
        }
      });

      staffList.forEach((s) => {
        const ref = doc(db, 'staff', s.id);
        batch.set(ref, sanitizeForFirestore(s));
      });
      await batch.commit();
    } catch (e) {
      console.error('Error saving staff list to Firestore:', e);
    }
  }

  public async deleteStaff(staffId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'staff', staffId));
    } catch (e) {
      console.error('Error deleting staff from Firestore:', e);
    }
    this.staffCache = this.staffCache.filter((s) => s.id !== staffId);
    this.saveToLocalStorage(STORAGE_KEYS.STAFF, this.staffCache);
    this.notifyStaffSubscribers();
  }

  // Save / Sync Events
  public async addEvent(event: EventItem): Promise<void> {
    try {
      const docRef = doc(db, 'events', event.id);
      await setDoc(docRef, sanitizeForFirestore(event));
    } catch (e) {
      console.error('Error adding event to Firestore:', e);
    }
    this.eventsCache = [event, ...this.eventsCache.filter((e) => e.id !== event.id)];
    this.saveToLocalStorage(STORAGE_KEYS.EVENTS, this.eventsCache);
    this.notifyEventsSubscribers();
  }

  public async saveEvents(events: EventItem[]): Promise<void> {
    this.eventsCache = events;
    this.saveToLocalStorage(STORAGE_KEYS.EVENTS, events);
    this.notifyEventsSubscribers();

    try {
      const batch = writeBatch(db);
      events.forEach((ev) => {
        const ref = doc(db, 'events', ev.id);
        batch.set(ref, sanitizeForFirestore(ev));
      });
      await batch.commit();
    } catch (e) {
      console.error('Error saving events to Firestore:', e);
    }
  }

  // Active event helper
  public getActiveEvent(): EventItem | null {
    const events = this.getEvents();
    return events.find((e) => e.status === 'OPEN') || null;
  }

  public setEventStatus(eventId: string, newStatus: EventStatus): EventItem[] {
    const events = this.getEvents();
    const updated = events.map((event) => {
      if (event.id === eventId) {
        return { ...event, status: newStatus };
      }
      if (newStatus === 'OPEN' && event.status === 'OPEN') {
        return { ...event, status: 'CLOSED' as EventStatus };
      }
      return event;
    });

    this.saveEvents(updated);
    return updated;
  }

  // Parse QR string into StaffID
  public parseQR(qrRaw: string): string | null {
    if (!qrRaw || typeof qrRaw !== 'string') return null;

    const trimmed = qrRaw.trim();

    if (trimmed.startsWith('STAFF|')) {
      return trimmed.replace('STAFF|', '').trim();
    }

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        return parsed.staffId || parsed.id || null;
      } catch {
        // continue
      }
    }

    if (/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      return trimmed.toUpperCase();
    }

    return null;
  }

  // Core Transaction Processing Flow
  public processScan(qrString: string, method: 'CAMERA_SCAN' | 'SIMULATOR' | 'MANUAL_OVERRIDE' = 'CAMERA_SCAN'): ScanResult {
    // 1. Parse QR
    const staffId = this.parseQR(qrString);
    if (!staffId) {
      soundService.playError();
      soundService.triggerVibrate([200, 100, 200]);
      return {
        status: 'INVALID_QR',
        title: '✕ QR TIDAK SAH',
        message: 'Format QR tidak dikenali. Sila imbas QR Kad Identiti Staf yang sah.'
      };
    }

    // 2. Identify Staff
    const staffList = this.getStaffList();
    const staff = staffList.find((s) => s.id.toUpperCase() === staffId.toUpperCase());

    if (!staff) {
      soundService.playError();
      soundService.triggerVibrate([200, 100, 200]);
      return {
        status: 'STAFF_NOT_FOUND',
        title: '✕ STAF TIDAK DIJUMPAI',
        message: `ID Staf "${staffId}" tidak wujud dalam pangkalan data master staf.`
      };
    }

    // 3. Get Active Event Context
    const activeEvent = this.getActiveEvent();
    if (!activeEvent) {
      soundService.playError();
      soundService.triggerVibrate([300, 100, 300]);
      return {
        status: 'NO_ACTIVE_EVENT',
        title: '✕ TIADA EVENT AKTIF',
        message: 'Tiada acara/program yang sedang dibuka (OPEN). Sila buka event di Pengurusan Event terlebih dahulu.',
        staff
      };
    }

    // 4. Duplicate Detection
    const records = this.getAttendanceRecords();
    const existing = records.find(
      (r) => r.eventId === activeEvent.id && r.staffId.toUpperCase() === staff.id.toUpperCase()
    );

    if (existing) {
      soundService.playDuplicate();
      soundService.triggerVibrate([100, 80, 100]);
      return {
        status: 'DUPLICATE',
        title: '⚠ SUDAH DIREKOD',
        message: `Kehadiran ${staff.name} bagi "${activeEvent.name}" telahpun direkodkan sebelum ini.`,
        staff,
        event: activeEvent,
        existingRecord: existing
      };
    }

    // 5. Save Attendance Transaction
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newRecord: AttendanceRecord = {
      id: `ATT-${Date.now().toString().slice(-6)}`,
      eventId: activeEvent.id,
      eventName: activeEvent.name,
      staffId: staff.id,
      staffName: staff.name,
      staffDepartment: staff.department,
      timestamp: now.toISOString(),
      formattedTime,
      method
    };

    // Save to Firestore asynchronously
    this.saveAttendanceRecordToFirestore(newRecord);

    // Update local cache & notify
    this.recordsCache = [newRecord, ...this.recordsCache];
    this.saveToLocalStorage(STORAGE_KEYS.RECORDS, this.recordsCache);
    this.notifyRecordsSubscribers();

    // Audio & Vibration Feedback
    soundService.playSuccess();
    soundService.triggerVibrate(150);

    return {
      status: 'SUCCESS',
      title: '✓ KEHADIRAN DIREKOD',
      message: `Kehadiran berjaya direkodkan untuk ${staff.name}.`,
      staff,
      event: activeEvent,
      timestamp: formattedTime
    };
  }

  private async saveAttendanceRecordToFirestore(record: AttendanceRecord) {
    try {
      const docRef = doc(db, 'attendanceRecords', record.id);
      await setDoc(docRef, sanitizeForFirestore(record));
    } catch (e) {
      console.error('Failed to save attendance record to Firestore:', e);
    }
  }

  public async saveAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
    this.recordsCache = records;
    this.saveToLocalStorage(STORAGE_KEYS.RECORDS, records);
    this.notifyRecordsSubscribers();

    if (records.length === 0) {
      // Clear Firestore collection
      try {
        const snap = await getDocs(collection(db, 'attendanceRecords'));
        const batch = writeBatch(db);
        snap.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      } catch (e) {
        console.error('Failed to clear attendance records from Firestore:', e);
      }
    } else {
      try {
        const batch = writeBatch(db);
        records.forEach((r) => {
          const ref = doc(db, 'attendanceRecords', r.id);
          batch.set(ref, sanitizeForFirestore(r));
        });
        await batch.commit();
      } catch (e) {
        console.error('Failed to save attendance records to Firestore:', e);
      }
    }
  }

  // Reset demo data in Firestore and local storage
  public async resetToDefaultData(): Promise<void> {
    await this.saveStaffList(INITIAL_STAFF);
    await this.saveEvents(INITIAL_EVENTS);
    await this.saveAttendanceRecords(INITIAL_ATTENDANCE);
  }
}

export const attendanceEngine = new AttendanceEngine();
