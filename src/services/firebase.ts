import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, Firestore, Timestamp } from 'firebase/firestore';
import rawAppletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: rawAppletConfig.apiKey || '',
  authDomain: rawAppletConfig.authDomain || 'syncrozzstaffattend.firebaseapp.com',
  projectId: rawAppletConfig.projectId || 'syncrozzstaffattend',
  storageBucket: rawAppletConfig.storageBucket || 'syncrozzstaffattend.firebasestorage.app',
  messagingSenderId: rawAppletConfig.messagingSenderId || '',
  appId: rawAppletConfig.appId || '',
  ...(rawAppletConfig.measurementId ? { measurementId: rawAppletConfig.measurementId } : {})
};

export const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Explicitly connect to the "(default)" Firestore database
export const db: Firestore = getFirestore(app);

let authInstance: Auth | null = null;
let authErrorMessage: string | null = null;

try {
  authInstance = getAuth(app);
} catch (error) {
  authInstance = null;
  authErrorMessage =
    error instanceof Error
      ? error.message
      : 'Firebase Authentication initialization failed.';
}

export const auth: Auth | null = authInstance;
export const authInitError: string | null = authErrorMessage;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Optional Google Analytics initialization only when measurementId is present
export let analytics: Analytics | null = null;
if (
  typeof window !== 'undefined' &&
  typeof rawAppletConfig.measurementId === 'string' &&
  rawAppletConfig.measurementId.trim() !== ''
) {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics is optional; skip silently when unsupported or blocked
    });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const currentUser = authInstance?.currentUser ?? null;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid ?? null,
      email: currentUser?.email ?? null,
      emailVerified: currentUser?.emailVerified ?? null,
      isAnonymous: currentUser?.isAnonymous ?? null,
      tenantId: currentUser?.tenantId ?? null,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Authenticated connection check (never runs unauthenticated under Default Deny)
export async function validateAuthenticatedConnection(uid: string): Promise<void> {
  if (!uid) return;
  try {
    await getDocFromServer(doc(db, 'users', uid));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firestore connection offline: please verify syncrozzstaffattend configuration.');
    }
  }
}

export function normalizeTimestamp(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (
    typeof val === 'object' &&
    val !== null &&
    'toDate' in val &&
    typeof (val as { toDate: () => Date }).toDate === 'function'
  ) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

// Utility to clean undefined values before saving to Firestore
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned as T;
}
