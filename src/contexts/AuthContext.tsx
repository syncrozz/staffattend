import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import {
  auth,
  authInitError,
  db,
  googleProvider,
  validateAuthenticatedConnection,
  handleFirestoreError,
  normalizeTimestamp,
  OperationType
} from '../services/firebase';
import { PlatformOwner, UserMembershipSummary } from '../types';

export const APPROVED_PLATFORM_OWNER_EMAILS = new Set([
  'khaikerr@gmail.com',
  'festivalseni.kpmbp@gmail.com'
]);

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isSigningIn: boolean;
  authError: string | null;
  platformOwner: PlatformOwner | null;
  isPlatformOwner: boolean;
  memberships: UserMembershipSummary[];
  membershipsLoaded: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(!auth);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [platformOwner, setPlatformOwner] = useState<PlatformOwner | null>(null);
  const [memberships, setMemberships] = useState<UserMembershipSummary[]>([]);
  const [membershipsLoaded, setMembershipsLoaded] = useState<boolean>(!auth);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      setMembershipsLoaded(true);
      return;
    }

    let unsubMemberships: (() => void) | null = null;
    let unsubOwner: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubMemberships) {
        unsubMemberships();
        unsubMemberships = null;
      }
      if (unsubOwner) {
        unsubOwner();
        unsubOwner = null;
      }

      if (!firebaseUser) {
        setUser(null);
        setPlatformOwner(null);
        setMemberships([]);
        setMembershipsLoaded(true);
        setAuthReady(true);
        return;
      }

      const isGoogleProvider = firebaseUser.providerData.some((p) => p.providerId === 'google.com');
      if (!firebaseUser.emailVerified || !firebaseUser.email || !isGoogleProvider) {
        setAuthError('Akaun Google yang disahkan (email_verified) diperlukan untuk mengakses StaffAttend.');
        await signOut(auth).catch(() => {});
        setUser(null);
        setPlatformOwner(null);
        setMemberships([]);
        setMembershipsLoaded(true);
        setAuthReady(true);
        return;
      }

      setUser(firebaseUser);
      setAuthError(null);
      setMembershipsLoaded(false);

      const normalizedEmail = firebaseUser.email.toLowerCase();
      const displayName = (firebaseUser.displayName || normalizedEmail.split('@')[0] || 'Pengguna').slice(0, 120);

      // Validate Firestore connectivity once authenticated
      validateAuthenticatedConnection(firebaseUser.uid).catch(() => {});

      // Sync own user profile record (/users/{uid})
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      try {
        await setDoc(
          userDocRef,
          {
            uid: firebaseUser.uid,
            email: normalizedEmail,
            displayName,
            ...(firebaseUser.photoURL ? { photoURL: firebaseUser.photoURL.slice(0, 500) } : {}),
            updatedAt: serverTimestamp()
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('User profile sync warning:', err);
      }

      // Dual Platform Owner verified UID bootstrap + Firestore-enforced resolution
      // Frontend email check ONLY triggers the bootstrap write attempt;
      // Firestore Security Rules enforce server-side allowlist, email_verified, google.com & UID binding.
      const ownerDocRef = doc(db, 'platformOwners', firebaseUser.uid);
      if (APPROVED_PLATFORM_OWNER_EMAILS.has(normalizedEmail)) {
        try {
          const ownerSnap = await getDoc(ownerDocRef);
          if (!ownerSnap.exists()) {
            await setDoc(ownerDocRef, {
              uid: firebaseUser.uid,
              email: normalizedEmail,
              displayName,
              role: 'PLATFORM_OWNER',
              status: 'ACTIVE',
              createdAt: serverTimestamp(),
              lastLoginAt: serverTimestamp()
            });
          } else {
            await updateDoc(ownerDocRef, {
              displayName,
              lastLoginAt: serverTimestamp()
            });
          }
        } catch (err) {
          console.warn('Platform owner bootstrap/sync notice:', err);
        }
      }

      // Subscribe strictly to the authoritative /platformOwners/{uid} record
      unsubOwner = onSnapshot(
        ownerDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.role === 'PLATFORM_OWNER' && data.status === 'ACTIVE' && data.uid === firebaseUser.uid) {
              setPlatformOwner({
                uid: data.uid,
                email: data.email,
                displayName: data.displayName,
                role: 'PLATFORM_OWNER',
                status: 'ACTIVE',
                createdAt: normalizeTimestamp(data.createdAt),
                lastLoginAt: data.lastLoginAt ? normalizeTimestamp(data.lastLoginAt) : undefined
              });
            } else {
              setPlatformOwner(null);
            }
          } else {
            setPlatformOwner(null);
          }
        },
        () => {
          // Non-owners will receive PERMISSION_DENIED on /platformOwners/{theirUid} — expected under Default Deny
          setPlatformOwner(null);
        }
      );

      // Subscribe strictly to user's own membership index (/users/{uid}/memberships)
      const membershipsColRef = collection(db, 'users', firebaseUser.uid, 'memberships');
      unsubMemberships = onSnapshot(
        membershipsColRef,
        (snapshot) => {
          const list: UserMembershipSummary[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            if (d.status === 'ACTIVE') {
              list.push({
                uid: d.uid,
                institutionId: d.institutionId,
                institutionName: d.institutionName,
                institutionCode: d.institutionCode,
                role: d.role,
                status: d.status,
                updatedAt: normalizeTimestamp(d.updatedAt)
              });
            }
          });
          setMemberships(list);
          setMembershipsLoaded(true);
          setAuthReady(true);
        },
        (error) => {
          setMemberships([]);
          setMembershipsLoaded(true);
          setAuthReady(true);
          handleFirestoreError(error, OperationType.LIST, `users/${firebaseUser.uid}/memberships`);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubMemberships) unsubMemberships();
      if (unsubOwner) unsubOwner();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      setAuthError(
        authInitError ||
          'Firebase Authentication tidak dapat dimulakan daripada firebase-applet-config.json.'
      );
      return;
    }
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Log masuk Google gagal.';
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    if (!auth) return;
    await signOut(auth);
  }, []);

  // Platform Owner privilege strictly requires the verified Firestore record
  const isPlatformOwner = Boolean(
    user &&
    user.emailVerified &&
    platformOwner &&
    platformOwner.status === 'ACTIVE' &&
    platformOwner.role === 'PLATFORM_OWNER' &&
    platformOwner.uid === user.uid
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isSigningIn,
        authError,
        platformOwner,
        isPlatformOwner,
        memberships,
        membershipsLoaded,
        signInWithGoogle,
        signOutUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
