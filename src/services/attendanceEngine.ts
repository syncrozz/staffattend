import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  runTransaction,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import {
  db,
  sanitizeForFirestore,
  normalizeTimestamp,
  handleFirestoreError,
  OperationType
} from './firebase';
import {
  Staff,
  EventItem,
  AttendanceRecord,
  ScanResult,
  EventStatus,
  ScanMethod,
  ScannerDevice,
  InstitutionMember
} from '../types';
import { soundService } from './soundService';

class AttendanceEngine {
  // Parse QR string into StaffID (preserves STAFF|{id}, custom prefix, JSON, or raw ID)
  public parseQR(qrRaw: string, qrPrefix: string = 'STAFF'): string | null {
    if (!qrRaw || typeof qrRaw !== 'string') return null;

    const trimmed = qrRaw.trim();
    const upperPrefix = `${qrPrefix.toUpperCase()}|`;

    if (trimmed.toUpperCase().startsWith(upperPrefix)) {
      const extracted = trimmed.slice(upperPrefix.length).trim().toUpperCase();
      return /^[A-Za-z0-9_-]+$/.test(extracted) ? extracted : null;
    }

    if (trimmed.toUpperCase().startsWith('STAFF|')) {
      const extracted = trimmed.slice(6).trim().toUpperCase();
      return /^[A-Za-z0-9_-]+$/.test(extracted) ? extracted : null;
    }

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        const candidate = (parsed.staffId || parsed.id || '').toString().trim().toUpperCase();
        return /^[A-Za-z0-9_-]+$/.test(candidate) ? candidate : null;
      } catch {
        return null;
      }
    }

    if (/^[A-Za-z0-9_-]+$/.test(trimmed)) {
      return trimmed.toUpperCase();
    }

    return null;
  }

  // Tenant-scoped real-time subscriptions (only attached after Auth + Institution Membership)
  public subscribeStaff(
    institutionId: string,
    onData: (staff: Staff[]) => void,
    onError?: (err: unknown) => void
  ): () => void {
    if (!institutionId) {
      onData([]);
      return () => {};
    }

    const path = `institutions/${institutionId}/staff`;
    return onSnapshot(
      collection(db, 'institutions', institutionId, 'staff'),
      (snapshot) => {
        const list: Staff[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: d.id || docSnap.id,
            institutionId: d.institutionId || institutionId,
            name: d.name,
            department: d.department,
            position: d.position,
            email: d.email,
            phone: d.phone,
            avatarUrl: d.avatarUrl,
            status: d.status || 'ACTIVE',
            updatedByUid: d.updatedByUid,
            updatedAt: normalizeTimestamp(d.updatedAt)
          });
        });
        list.sort((a, b) => a.id.localeCompare(b.id));
        onData(list);
      },
      (error) => {
        onData([]);
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  public subscribeEvents(
    institutionId: string,
    onData: (events: EventItem[]) => void,
    onError?: (err: unknown) => void
  ): () => void {
    if (!institutionId) {
      onData([]);
      return () => {};
    }

    const path = `institutions/${institutionId}/events`;
    return onSnapshot(
      collection(db, 'institutions', institutionId, 'events'),
      (snapshot) => {
        const list: EventItem[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: d.id || docSnap.id,
            institutionId: d.institutionId || institutionId,
            name: d.name,
            category: d.category,
            date: d.date,
            startTime: d.startTime,
            endTime: d.endTime,
            location: d.location,
            status: d.status,
            description: d.description,
            targetCount: d.targetCount,
            createdByUid: d.createdByUid,
            createdAt: normalizeTimestamp(d.createdAt),
            updatedAt: normalizeTimestamp(d.updatedAt)
          });
        });
        list.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
        onData(list);
      },
      (error) => {
        onData([]);
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  public subscribeAttendanceRecords(
    institutionId: string,
    onData: (records: AttendanceRecord[]) => void,
    onError?: (err: unknown) => void
  ): () => void {
    if (!institutionId) {
      onData([]);
      return () => {};
    }

    const path = `institutions/${institutionId}/attendanceRecords`;
    return onSnapshot(
      collection(db, 'institutions', institutionId, 'attendanceRecords'),
      (snapshot) => {
        const list: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: d.id || docSnap.id,
            institutionId: d.institutionId || institutionId,
            eventId: d.eventId,
            eventName: d.eventName,
            staffId: d.staffId,
            staffName: d.staffName,
            staffDepartment: d.staffDepartment,
            timestamp: normalizeTimestamp(d.timestamp),
            formattedTime: d.formattedTime,
            method: d.method,
            scannerDeviceId: d.scannerDeviceId,
            recordedByUid: d.recordedByUid
          });
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onData(list);
      },
      (error) => {
        onData([]);
        if (onError) onError(error);
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  }

  public subscribeMembers(
    institutionId: string,
    onData: (members: InstitutionMember[]) => void
  ): () => void {
    if (!institutionId) {
      onData([]);
      return () => {};
    }

    const path = `institutions/${institutionId}/members`;
    return onSnapshot(
      collection(db, 'institutions', institutionId, 'members'),
      (snapshot) => {
        const list: InstitutionMember[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            uid: d.uid || docSnap.id,
            institutionId: d.institutionId || institutionId,
            email: d.email,
            displayName: d.displayName,
            role: d.role,
            status: d.status,
            assignedByUid: d.assignedByUid,
            createdAt: normalizeTimestamp(d.createdAt),
            updatedAt: normalizeTimestamp(d.updatedAt)
          });
        });
        list.sort((a, b) => a.email.localeCompare(b.email));
        onData(list);
      },
      (error) => {
        onData([]);
        console.warn('Members listener notice:', error);
      }
    );
  }

  public subscribeScannerDevices(
    institutionId: string,
    onData: (devices: ScannerDevice[]) => void
  ): () => void {
    if (!institutionId) {
      onData([]);
      return () => {};
    }

    return onSnapshot(
      collection(db, 'institutions', institutionId, 'scannerDevices'),
      (snapshot) => {
        const list: ScannerDevice[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: d.id || docSnap.id,
            institutionId: d.institutionId || institutionId,
            label: d.label,
            status: d.status,
            registeredByUid: d.registeredByUid,
            createdAt: normalizeTimestamp(d.createdAt),
            lastSeenAt: d.lastSeenAt ? normalizeTimestamp(d.lastSeenAt) : undefined
          });
        });
        list.sort((a, b) => a.label.localeCompare(b.label));
        onData(list);
      },
      (error) => {
        onData([]);
        console.warn('Scanner devices listener notice:', error);
      }
    );
  }

  // Staff CRUD (Authoritative Firestore, no auto-seed, no resurrection)
  public async upsertStaff(institutionId: string, staff: Staff, actorUid: string): Promise<void> {
    const cleanId = staff.id.trim().toUpperCase();
    const path = `institutions/${institutionId}/staff/${cleanId}`;
    try {
      await setDoc(
        doc(db, 'institutions', institutionId, 'staff', cleanId),
        sanitizeForFirestore({
          ...staff,
          id: cleanId,
          institutionId,
          updatedByUid: actorUid,
          updatedAt: serverTimestamp()
        })
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async syncStaffBatch(institutionId: string, staffItems: Staff[], actorUid: string): Promise<void> {
    const chunkSize = 400;
    for (let i = 0; i < staffItems.length; i += chunkSize) {
      const chunk = staffItems.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((s) => {
        const cleanId = s.id.trim().toUpperCase();
        const ref = doc(db, 'institutions', institutionId, 'staff', cleanId);
        batch.set(
          ref,
          sanitizeForFirestore({
            ...s,
            id: cleanId,
            institutionId,
            updatedByUid: actorUid,
            updatedAt: serverTimestamp()
          })
        );
      });
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `institutions/${institutionId}/staff`);
      }
    }
  }

  public async deleteStaff(institutionId: string, staffId: string): Promise<void> {
    const path = `institutions/${institutionId}/staff/${staffId}`;
    try {
      await deleteDoc(doc(db, 'institutions', institutionId, 'staff', staffId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // Events CRUD with atomic single-OPEN-event guarantee
  public async createEvent(
    institutionId: string,
    newEventData: Omit<EventItem, 'id' | 'institutionId' | 'createdAt' | 'updatedAt' | 'createdByUid'>,
    actorUid: string
  ): Promise<string> {
    const eventId = `EVT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const path = `institutions/${institutionId}/events/${eventId}`;

    try {
      const batch = writeBatch(db);
      if (newEventData.status === 'OPEN') {
        const openSnap = await getDocs(
          query(collection(db, 'institutions', institutionId, 'events'), where('status', '==', 'OPEN'))
        );
        openSnap.forEach((docSnap) => {
          batch.update(docSnap.ref, {
            status: 'CLOSED',
            updatedAt: serverTimestamp()
          });
        });
      }

      batch.set(
        doc(db, 'institutions', institutionId, 'events', eventId),
        sanitizeForFirestore({
          ...newEventData,
          id: eventId,
          institutionId,
          createdByUid: actorUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
      );

      await batch.commit();
      return eventId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async setEventStatus(institutionId: string, eventId: string, newStatus: EventStatus): Promise<void> {
    const path = `institutions/${institutionId}/events/${eventId}`;
    try {
      const batch = writeBatch(db);
      if (newStatus === 'OPEN') {
        const openSnap = await getDocs(
          query(collection(db, 'institutions', institutionId, 'events'), where('status', '==', 'OPEN'))
        );
        openSnap.forEach((docSnap) => {
          if (docSnap.id !== eventId) {
            batch.update(docSnap.ref, {
              status: 'CLOSED',
              updatedAt: serverTimestamp()
            });
          }
        });
      }

      batch.update(doc(db, 'institutions', institutionId, 'events', eventId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  // Atomic Firestore Transaction Scan Processing (Server-Authoritative Confirmation)
  public async processScan(params: {
    institutionId: string;
    qrString: string;
    method: ScanMethod;
    recordedByUid: string;
    activeEventId?: string;
    qrPrefix?: string;
    scannerDeviceId?: string;
  }): Promise<ScanResult> {
    const {
      institutionId,
      qrString,
      method,
      recordedByUid,
      activeEventId,
      qrPrefix = 'STAFF',
      scannerDeviceId
    } = params;

    // 1. Parse QR
    const staffId = this.parseQR(qrString, qrPrefix);
    if (!staffId) {
      soundService.playError();
      soundService.triggerVibrate([200, 100, 200]);
      return {
        status: 'INVALID_QR',
        title: '✕ QR TIDAK SAH',
        message: 'Format QR tidak dikenali. Sila imbas QR Kad Identiti Staf yang sah.'
      };
    }

    try {
      // 2. Resolve target OPEN event
      let targetEventId = activeEventId;
      if (!targetEventId) {
        const openSnap = await getDocs(
          query(collection(db, 'institutions', institutionId, 'events'), where('status', '==', 'OPEN'))
        );
        if (!openSnap.empty) {
          targetEventId = openSnap.docs[0].id;
        }
      }

      if (!targetEventId) {
        soundService.playError();
        soundService.triggerVibrate([300, 100, 300]);
        return {
          status: 'NO_ACTIVE_EVENT',
          title: '✕ TIADA EVENT AKTIF',
          message: 'Tiada acara/program yang sedang dibuka (OPEN). Sila buka event di Pengurusan Event terlebih dahulu.'
        };
      }

      const staffRef = doc(db, 'institutions', institutionId, 'staff', staffId);
      const eventRef = doc(db, 'institutions', institutionId, 'events', targetEventId);
      const recordId = `${targetEventId}__${staffId}`;
      const recordRef = doc(db, 'institutions', institutionId, 'attendanceRecords', recordId);

      const now = new Date();
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      // 3. Atomic Firestore Transaction (verifies Staff, Event OPEN, and Duplicate prevention on server)
      const txResult = await runTransaction<ScanResult>(db, async (tx) => {
        const [staffSnap, eventSnap, recordSnap] = await Promise.all([
          tx.get(staffRef),
          tx.get(eventRef),
          tx.get(recordRef)
        ]);

        if (!staffSnap.exists()) {
          return {
            status: 'STAFF_NOT_FOUND',
            title: '✕ STAF TIDAK DIJUMPAI',
            message: `ID Staf "${staffId}" tidak wujud dalam direktori staf institusi ini.`
          };
        }

        const staffData = staffSnap.data() as Staff;
        if (staffData.status !== 'ACTIVE') {
          return {
            status: 'STAFF_INACTIVE',
            title: '✕ STAF TIDAK AKTIF',
            message: `Status staf ${staffData.name} (${staffId}) adalah INACTIVE.`,
            staff: staffData
          };
        }

        if (!eventSnap.exists() || eventSnap.data().status !== 'OPEN') {
          return {
            status: 'NO_ACTIVE_EVENT',
            title: '✕ TIADA EVENT AKTIF',
            message: 'Acara yang dipilih bukan lagi berstatus OPEN.',
            staff: staffData
          };
        }

        const eventData = eventSnap.data() as EventItem;

        if (recordSnap.exists()) {
          const existingData = recordSnap.data();
          const existingRecord: AttendanceRecord = {
            id: recordSnap.id,
            institutionId,
            eventId: existingData.eventId,
            eventName: existingData.eventName,
            staffId: existingData.staffId,
            staffName: existingData.staffName,
            staffDepartment: existingData.staffDepartment,
            timestamp: normalizeTimestamp(existingData.timestamp),
            formattedTime: existingData.formattedTime,
            method: existingData.method,
            scannerDeviceId: existingData.scannerDeviceId,
            recordedByUid: existingData.recordedByUid
          };
          return {
            status: 'DUPLICATE',
            title: '⚠ SUDAH DIREKOD',
            message: `Kehadiran ${staffData.name} bagi "${eventData.name}" telahpun direkodkan sebelum ini.`,
            staff: staffData,
            event: eventData,
            existingRecord
          };
        }

        tx.set(
          recordRef,
          sanitizeForFirestore({
            id: recordId,
            institutionId,
            eventId: targetEventId,
            eventName: eventData.name.slice(0, 200),
            staffId: staffData.id,
            staffName: staffData.name.slice(0, 150),
            staffDepartment: staffData.department.slice(0, 120),
            timestamp: serverTimestamp(),
            formattedTime,
            method,
            ...(scannerDeviceId ? { scannerDeviceId } : {}),
            recordedByUid
          })
        );

        return {
          status: 'SUCCESS',
          title: '✓ KEHADIRAN DIREKOD',
          message: `Kehadiran berjaya direkodkan dan disahkan oleh pelayan untuk ${staffData.name}.`,
          staff: staffData,
          event: eventData,
          timestamp: formattedTime
        };
      });

      if (txResult.status === 'SUCCESS') {
        soundService.playSuccess();
        soundService.triggerVibrate(150);
      } else if (txResult.status === 'DUPLICATE') {
        soundService.playDuplicate();
        soundService.triggerVibrate([100, 80, 100]);
      } else {
        soundService.playError();
        soundService.triggerVibrate([200, 100, 200]);
      }

      return txResult;
    } catch (error) {
      soundService.playError();
      soundService.triggerVibrate([250, 100, 250]);
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
        return {
          status: 'PERMISSION_DENIED',
          title: '✕ AKSES DITOLAK',
          message: 'Operasi ditolak oleh Firestore Security Rules. Pastikan akaun anda mempunyai peranan Operator atau Admin institusi yang aktif.'
        };
      }
      return {
        status: 'NETWORK_ERROR',
        title: '✕ RALAT SAMBUNGAN',
        message: `Rekod gagal disahkan oleh Firestore: ${msg}`
      };
    }
  }

  // Clear Attendance Records (Admin only, chunked batch delete)
  public async clearAttendanceRecords(institutionId: string): Promise<void> {
    const path = `institutions/${institutionId}/attendanceRecords`;
    try {
      const snap = await getDocs(collection(db, 'institutions', institutionId, 'attendanceRecords'));
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // Scanner Device Management
  public async registerScannerDevice(institutionId: string, label: string, actorUid: string): Promise<string> {
    const deviceId = `DEV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const path = `institutions/${institutionId}/scannerDevices/${deviceId}`;
    try {
      await setDoc(doc(db, 'institutions', institutionId, 'scannerDevices', deviceId), {
        id: deviceId,
        institutionId,
        label: label.trim().slice(0, 120),
        status: 'ACTIVE',
        registeredByUid: actorUid,
        createdAt: serverTimestamp(),
        lastSeenAt: serverTimestamp()
      });
      return deviceId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  public async setScannerDeviceStatus(
    institutionId: string,
    deviceId: string,
    status: 'ACTIVE' | 'REVOKED'
  ): Promise<void> {
    const path = `institutions/${institutionId}/scannerDevices/${deviceId}`;
    try {
      await setDoc(
        doc(db, 'institutions', institutionId, 'scannerDevices', deviceId),
        { status, lastSeenAt: serverTimestamp() },
        { merge: true }
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  public async deleteScannerDevice(institutionId: string, deviceId: string): Promise<void> {
    const path = `institutions/${institutionId}/scannerDevices/${deviceId}`;
    try {
      await deleteDoc(doc(db, 'institutions', institutionId, 'scannerDevices', deviceId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

export const attendanceEngine = new AttendanceEngine();
