import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import {
  db,
  handleFirestoreError,
  normalizeTimestamp,
  OperationType
} from '../services/firebase';
import { useAuth } from './AuthContext';
import {
  Institution,
  InstitutionMember,
  InstitutionRole,
  InstitutionSettings
} from '../types';

const ACTIVE_INSTITUTION_STORAGE_KEY = 'staffattend_active_institution_v2';

interface InstitutionContextValue {
  activeInstitutionId: string | null;
  activeInstitution: Institution | null;
  activeSettings: InstitutionSettings | null;
  activeMember: InstitutionMember | null;
  effectiveRole: InstitutionRole | null;
  isInstitutionAdmin: boolean;
  isOperator: boolean;
  isViewer: boolean;
  allInstitutions: Institution[];
  institutionReady: boolean;
  selectInstitution: (institutionId: string) => void;
  createInstitution: (input: { name: string; code: string; domain?: string; defaultEmailDomain?: string; avatarBaseUrl?: string }) => Promise<string>;
  toggleInstitutionStatus: (institutionId: string, status: 'ACTIVE' | 'SUSPENDED') => Promise<void>;
  assignInstitutionMember: (input: {
    institutionId: string;
    uid: string;
    email: string;
    displayName: string;
    role: InstitutionRole;
  }) => Promise<void>;
  revokeInstitutionMember: (institutionId: string, uid: string) => Promise<void>;
  updateInstitutionSettings: (settings: Partial<InstitutionSettings>) => Promise<void>;
}

const InstitutionContext = createContext<InstitutionContextValue | undefined>(undefined);

export const InstitutionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authReady, isPlatformOwner, memberships, membershipsLoaded } = useAuth();

  const [activeInstitutionId, setActiveInstitutionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_INSTITUTION_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [activeInstitution, setActiveInstitution] = useState<Institution | null>(null);
  const [activeSettings, setActiveSettings] = useState<InstitutionSettings | null>(null);
  const [activeMember, setActiveMember] = useState<InstitutionMember | null>(null);
  const [allInstitutions, setAllInstitutions] = useState<Institution[]>([]);
  const [institutionReady, setInstitutionReady] = useState<boolean>(false);

  // Platform owners can list all institutions
  useEffect(() => {
    if (!authReady || !user || !isPlatformOwner) {
      setAllInstitutions([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'institutions'),
      (snap) => {
        const list: Institution[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: d.id,
            name: d.name,
            code: d.code,
            domain: d.domain,
            status: d.status,
            createdByUid: d.createdByUid,
            createdAt: normalizeTimestamp(d.createdAt),
            updatedAt: normalizeTimestamp(d.updatedAt)
          });
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setAllInstitutions(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'institutions');
      }
    );

    return () => unsub();
  }, [authReady, user, isPlatformOwner]);

  // Select active institution automatically from memberships or platform institutions
  useEffect(() => {
    if (!authReady || !membershipsLoaded) return;

    if (!user) {
      setActiveInstitutionId(null);
      setActiveInstitution(null);
      setActiveSettings(null);
      setActiveMember(null);
      setInstitutionReady(true);
      return;
    }

    const availableIds = new Set<string>([
      ...memberships.map((m) => m.institutionId),
      ...allInstitutions.map((i) => i.id)
    ]);

    if (activeInstitutionId && availableIds.has(activeInstitutionId)) {
      setInstitutionReady(true);
      return;
    }

    if (memberships.length > 0) {
      const nextId = memberships[0].institutionId;
      setActiveInstitutionId(nextId);
      try {
        localStorage.setItem(ACTIVE_INSTITUTION_STORAGE_KEY, nextId);
      } catch {}
    } else if (isPlatformOwner && allInstitutions.length > 0) {
      const nextId = allInstitutions[0].id;
      setActiveInstitutionId(nextId);
      try {
        localStorage.setItem(ACTIVE_INSTITUTION_STORAGE_KEY, nextId);
      } catch {}
    } else {
      setActiveInstitutionId(null);
    }

    setInstitutionReady(true);
  }, [authReady, membershipsLoaded, user, memberships, allInstitutions, activeInstitutionId, isPlatformOwner]);

  // Subscribe to active institution, settings, and authoritative member record
  useEffect(() => {
    if (!user || !activeInstitutionId) {
      setActiveInstitution(null);
      setActiveSettings(null);
      setActiveMember(null);
      return;
    }

    const instPath = `institutions/${activeInstitutionId}`;
    const unsubInst = onSnapshot(
      doc(db, 'institutions', activeInstitutionId),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setActiveInstitution({
            id: d.id,
            name: d.name,
            code: d.code,
            domain: d.domain,
            status: d.status,
            createdByUid: d.createdByUid,
            createdAt: normalizeTimestamp(d.createdAt),
            updatedAt: normalizeTimestamp(d.updatedAt)
          });
        } else {
          setActiveInstitution(null);
        }
      },
      (error) => {
        console.warn('Institution listener notice:', error);
        setActiveInstitution(null);
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'institutions', activeInstitutionId, 'settings', 'general'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setActiveSettings({
            institutionId: d.institutionId,
            defaultEmailDomain: d.defaultEmailDomain,
            avatarBaseUrl: d.avatarBaseUrl,
            qrPrefix: d.qrPrefix || 'STAFF',
            allowManualOverride: Boolean(d.allowManualOverride),
            requireAuthorizedDevice: Boolean(d.requireAuthorizedDevice),
            timezone: d.timezone || 'Asia/Kuala_Lumpur',
            updatedByUid: d.updatedByUid,
            updatedAt: normalizeTimestamp(d.updatedAt)
          });
        } else {
          setActiveSettings(null);
        }
      },
      (error) => {
        console.warn('Settings listener notice:', error);
        setActiveSettings(null);
      }
    );

    const unsubMember = onSnapshot(
      doc(db, 'institutions', activeInstitutionId, 'members', user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.status === 'ACTIVE' && d.uid === user.uid) {
            setActiveMember({
              uid: d.uid,
              institutionId: d.institutionId,
              email: d.email,
              displayName: d.displayName,
              role: d.role,
              status: d.status,
              assignedByUid: d.assignedByUid,
              createdAt: normalizeTimestamp(d.createdAt),
              updatedAt: normalizeTimestamp(d.updatedAt)
            });
          } else {
            setActiveMember(null);
          }
        } else {
          setActiveMember(null);
        }
      },
      () => {
        setActiveMember(null);
      }
    );

    return () => {
      unsubInst();
      unsubSettings();
      unsubMember();
    };
  }, [user, activeInstitutionId]);

  const selectInstitution = useCallback((institutionId: string) => {
    setActiveInstitutionId(institutionId);
    try {
      localStorage.setItem(ACTIVE_INSTITUTION_STORAGE_KEY, institutionId);
    } catch {}
  }, []);

  const createInstitution = useCallback(
    async (input: {
      name: string;
      code: string;
      domain?: string;
      defaultEmailDomain?: string;
      avatarBaseUrl?: string;
    }): Promise<string> => {
      if (!user || !isPlatformOwner) {
        throw new Error('Hanya Platform Owner yang disahkan boleh mencipta institusi.');
      }

      const cleanCode = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      const instId = cleanCode.toLowerCase();
      if (!instId || instId.length < 2) {
        throw new Error('Kod institusi mestilah sekurang-kurangnya 2 aksara alfanumerik.');
      }

      const batch = writeBatch(db);
      const instRef = doc(db, 'institutions', instId);
      const settingsRef = doc(db, 'institutions', instId, 'settings', 'general');
      const memberRef = doc(db, 'institutions', instId, 'members', user.uid);
      const userMembershipRef = doc(db, 'users', user.uid, 'memberships', instId);

      batch.set(instRef, {
        id: instId,
        name: input.name.trim().slice(0, 150),
        code: cleanCode.slice(0, 32),
        ...(input.domain ? { domain: input.domain.trim().slice(0, 150) } : {}),
        status: 'ACTIVE',
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      batch.set(settingsRef, {
        institutionId: instId,
        ...(input.defaultEmailDomain ? { defaultEmailDomain: input.defaultEmailDomain.trim().slice(0, 150) } : {}),
        ...(input.avatarBaseUrl ? { avatarBaseUrl: input.avatarBaseUrl.trim().slice(0, 500) } : {}),
        qrPrefix: 'STAFF',
        allowManualOverride: true,
        requireAuthorizedDevice: false,
        timezone: 'Asia/Kuala_Lumpur',
        updatedByUid: user.uid,
        updatedAt: serverTimestamp()
      });

      // Creator Platform Owner becomes initial INSTITUTION_ADMIN so they can manage tenant data safely
      const email = (user.email || '').toLowerCase();
      const displayName = (user.displayName || email.split('@')[0] || 'Admin').slice(0, 120);

      batch.set(memberRef, {
        uid: user.uid,
        institutionId: instId,
        email,
        displayName,
        role: 'INSTITUTION_ADMIN',
        status: 'ACTIVE',
        assignedByUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      batch.set(userMembershipRef, {
        uid: user.uid,
        institutionId: instId,
        institutionName: input.name.trim().slice(0, 150),
        institutionCode: cleanCode.slice(0, 32),
        role: 'INSTITUTION_ADMIN',
        status: 'ACTIVE',
        updatedAt: serverTimestamp()
      });

      try {
        await batch.commit();
        selectInstitution(instId);
        return instId;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `institutions/${instId}`);
      }
    },
    [user, isPlatformOwner, selectInstitution]
  );

  const toggleInstitutionStatus = useCallback(
    async (institutionId: string, status: 'ACTIVE' | 'SUSPENDED') => {
      if (!user || !isPlatformOwner) throw new Error('Akses Platform Owner diperlukan.');
      try {
        await updateDoc(doc(db, 'institutions', institutionId), {
          status,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `institutions/${institutionId}`);
      }
    },
    [user, isPlatformOwner]
  );

  const assignInstitutionMember = useCallback(
    async (input: {
      institutionId: string;
      uid: string;
      email: string;
      displayName: string;
      role: InstitutionRole;
    }) => {
      if (!user) throw new Error('Sila log masuk dahulu.');
      const targetInst =
        allInstitutions.find((i) => i.id === input.institutionId) ||
        (activeInstitution?.id === input.institutionId ? activeInstitution : null);

      const instName = targetInst?.name || input.institutionId;
      const instCode = targetInst?.code || input.institutionId.toUpperCase();
      const cleanUid = input.uid.trim();
      const cleanEmail = input.email.trim().toLowerCase();
      const cleanName = (input.displayName.trim() || cleanEmail.split('@')[0] || 'Pengguna').slice(0, 120);

      const memberRef = doc(db, 'institutions', input.institutionId, 'members', cleanUid);
      const userMembershipRef = doc(db, 'users', cleanUid, 'memberships', input.institutionId);
      const [memberSnap, userMembershipSnap] = await Promise.all([
        getDoc(memberRef),
        getDoc(userMembershipRef)
      ]);

      const batch = writeBatch(db);
      if (memberSnap.exists()) {
        batch.update(memberRef, {
          role: input.role,
          status: 'ACTIVE',
          displayName: cleanName,
          assignedByUid: user.uid,
          updatedAt: serverTimestamp()
        });
      } else {
        batch.set(memberRef, {
          uid: cleanUid,
          institutionId: input.institutionId,
          email: cleanEmail,
          displayName: cleanName,
          role: input.role,
          status: 'ACTIVE',
          assignedByUid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      if (userMembershipSnap.exists()) {
        batch.update(userMembershipRef, {
          institutionName: instName.slice(0, 150),
          institutionCode: instCode.slice(0, 32),
          role: input.role,
          status: 'ACTIVE',
          updatedAt: serverTimestamp()
        });
      } else {
        batch.set(userMembershipRef, {
          uid: cleanUid,
          institutionId: input.institutionId,
          institutionName: instName.slice(0, 150),
          institutionCode: instCode.slice(0, 32),
          role: input.role,
          status: 'ACTIVE',
          updatedAt: serverTimestamp()
        });
      }

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `institutions/${input.institutionId}/members/${cleanUid}`);
      }
    },
    [user, allInstitutions, activeInstitution]
  );

  const revokeInstitutionMember = useCallback(
    async (institutionId: string, uid: string) => {
      if (!user) throw new Error('Sila log masuk dahulu.');
      const memberRef = doc(db, 'institutions', institutionId, 'members', uid);
      const userMembershipRef = doc(db, 'users', uid, 'memberships', institutionId);
      const userMembershipSnap = await getDoc(userMembershipRef);

      const batch = writeBatch(db);
      batch.update(memberRef, {
        status: 'REVOKED',
        assignedByUid: user.uid,
        updatedAt: serverTimestamp()
      });
      if (userMembershipSnap.exists()) {
        batch.update(userMembershipRef, {
          status: 'REVOKED',
          updatedAt: serverTimestamp()
        });
      }
      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `institutions/${institutionId}/members/${uid}`);
      }
    },
    [user]
  );

  const updateInstitutionSettings = useCallback(
    async (settingsPatch: Partial<InstitutionSettings>) => {
      if (!user || !activeInstitutionId) throw new Error('Tiada institusi aktif.');
      const ref = doc(db, 'institutions', activeInstitutionId, 'settings', 'general');
      const payload = {
        institutionId: activeInstitutionId,
        qrPrefix: settingsPatch.qrPrefix ?? activeSettings?.qrPrefix ?? 'STAFF',
        allowManualOverride: settingsPatch.allowManualOverride ?? activeSettings?.allowManualOverride ?? true,
        requireAuthorizedDevice: settingsPatch.requireAuthorizedDevice ?? activeSettings?.requireAuthorizedDevice ?? false,
        timezone: settingsPatch.timezone ?? activeSettings?.timezone ?? 'Asia/Kuala_Lumpur',
        ...(settingsPatch.defaultEmailDomain !== undefined
          ? { defaultEmailDomain: settingsPatch.defaultEmailDomain }
          : activeSettings?.defaultEmailDomain
          ? { defaultEmailDomain: activeSettings.defaultEmailDomain }
          : {}),
        ...(settingsPatch.avatarBaseUrl !== undefined
          ? { avatarBaseUrl: settingsPatch.avatarBaseUrl }
          : activeSettings?.avatarBaseUrl
          ? { avatarBaseUrl: activeSettings.avatarBaseUrl }
          : {}),
        updatedByUid: user.uid,
        updatedAt: serverTimestamp()
      };

      try {
        await setDoc(ref, payload);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `institutions/${activeInstitutionId}/settings/general`);
      }
    },
    [user, activeInstitutionId, activeSettings]
  );

  const effectiveRole: InstitutionRole | null = activeMember?.status === 'ACTIVE' ? activeMember.role : null;
  const isInstitutionAdmin = effectiveRole === 'INSTITUTION_ADMIN';
  const isOperator = effectiveRole === 'INSTITUTION_ADMIN' || effectiveRole === 'OPERATOR';
  const isViewer = effectiveRole === 'INSTITUTION_ADMIN' || effectiveRole === 'OPERATOR' || effectiveRole === 'VIEWER';

  return (
    <InstitutionContext.Provider
      value={{
        activeInstitutionId,
        activeInstitution,
        activeSettings,
        activeMember,
        effectiveRole,
        isInstitutionAdmin,
        isOperator,
        isViewer,
        allInstitutions,
        institutionReady,
        selectInstitution,
        createInstitution,
        toggleInstitutionStatus,
        assignInstitutionMember,
        revokeInstitutionMember,
        updateInstitutionSettings
      }}
    >
      {children}
    </InstitutionContext.Provider>
  );
};

export function useInstitution(): InstitutionContextValue {
  const ctx = useContext(InstitutionContext);
  if (!ctx) throw new Error('useInstitution must be used inside InstitutionProvider');
  return ctx;
}
