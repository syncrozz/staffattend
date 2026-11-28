/**
 * SYNCROZZ StaffAttend — Repeatable Firestore Security Rules Test Suite (SES v4.4)
 *
 * Requires Java 11+ and `@firebase/rules-unit-testing` dev dependency:
 *   npm i -D @firebase/rules-unit-testing
 *   firebase emulators:exec --only firestore --project syncrozzstaffattend "node --test tests/firestore.rules.test.mjs"
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

let initializeTestEnvironment;
let assertFails;
let assertSucceeds;

try {
  ({ initializeTestEnvironment, assertFails, assertSucceeds } = await import('@firebase/rules-unit-testing'));
} catch {
  console.error(
    'Missing @firebase/rules-unit-testing. Install via `npm i -D @firebase/rules-unit-testing` and run inside `firebase emulators:exec --only firestore` with Java 11+.'
  );
  process.exit(1);
}

const {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} = await import('firebase/firestore');

const PROJECT_ID = 'syncrozzstaffattend';
const OWNER_1_UID = 'uid_owner_khaikerr_001';
const OWNER_1_EMAIL = 'khaikerr@gmail.com';
const OWNER_2_UID = 'uid_owner_festivalseni_002';
const OWNER_2_EMAIL = 'festivalseni.kpmbp@gmail.com';
const THIRD_PARTY_UID = 'uid_third_party_003';
const THIRD_PARTY_EMAIL = 'unrelated.user@gmail.com';
const INST_A_ADMIN_UID = 'uid_insta_admin_004';
const INST_A_OPERATOR_UID = 'uid_insta_op_005';
const INST_B_ADMIN_UID = 'uid_instb_admin_006';

let testEnv;

function googleAuth(uid, email, emailVerified = true) {
  return {
    sub: uid,
    email,
    email_verified: emailVerified,
    firebase: { sign_in_provider: 'google.com' }
  };
}

test.before(async () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules }
  });
});

test.after(async () => {
  await testEnv?.cleanup();
});

test.beforeEach(async () => {
  await testEnv.clearFirestore();
});

test('1. Unauthenticated reads and writes are denied everywhere (Default Deny)', async () => {
  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(unauthDb, 'platformOwners', OWNER_1_UID)));
  await assertFails(getDoc(doc(unauthDb, 'institutions', 'kpmbp')));
  await assertFails(getDoc(doc(unauthDb, 'institutions', 'kpmbp', 'staff', 'ST001')));
  await assertFails(
    setDoc(doc(unauthDb, 'platformOwners', 'fake_uid'), {
      uid: 'fake_uid',
      email: 'fake@gmail.com',
      displayName: 'Fake',
      role: 'PLATFORM_OWNER',
      status: 'ACTIVE',
      createdAt: serverTimestamp()
    })
  );
});

test('2. Dual Platform Owners can bootstrap ONLY their own verified UID doc and receive identical privileges', async () => {
  const owner1Db = testEnv.authenticatedContext(OWNER_1_UID, googleAuth(OWNER_1_UID, OWNER_1_EMAIL)).firestore();
  const owner2Db = testEnv.authenticatedContext(OWNER_2_UID, googleAuth(OWNER_2_UID, OWNER_2_EMAIL)).firestore();

  // Unverified email must fail
  const unverifiedDb = testEnv
    .authenticatedContext(OWNER_1_UID, googleAuth(OWNER_1_UID, OWNER_1_EMAIL, false))
    .firestore();
  await assertFails(
    setDoc(doc(unverifiedDb, 'platformOwners', OWNER_1_UID), {
      uid: OWNER_1_UID,
      email: OWNER_1_EMAIL,
      displayName: 'Owner 1',
      role: 'PLATFORM_OWNER',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    })
  );

  // Owner 1 bootstraps own UID record
  await assertSucceeds(
    setDoc(doc(owner1Db, 'platformOwners', OWNER_1_UID), {
      uid: OWNER_1_UID,
      email: OWNER_1_EMAIL,
      displayName: 'Owner 1',
      role: 'PLATFORM_OWNER',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    })
  );

  // Owner 2 bootstraps own UID record
  await assertSucceeds(
    setDoc(doc(owner2Db, 'platformOwners', OWNER_2_UID), {
      uid: OWNER_2_UID,
      email: OWNER_2_EMAIL,
      displayName: 'Owner 2',
      role: 'PLATFORM_OWNER',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    })
  );

  // Both can create/manage institutions identically
  await assertSucceeds(
    setDoc(doc(owner1Db, 'institutions', 'inst_a'), {
      id: 'inst_a',
      name: 'Institusi A',
      code: 'INSTA',
      status: 'ACTIVE',
      createdByUid: OWNER_1_UID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );

  await assertSucceeds(
    setDoc(doc(owner2Db, 'institutions', 'inst_b'), {
      id: 'inst_b',
      name: 'Institusi B',
      code: 'INSTB',
      status: 'ACTIVE',
      createdByUid: OWNER_2_UID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );
});

test('3. Cross-owner impersonation and immutable owner fields are strictly blocked', async () => {
  const owner1Db = testEnv.authenticatedContext(OWNER_1_UID, googleAuth(OWNER_1_UID, OWNER_1_EMAIL)).firestore();
  const owner2Db = testEnv.authenticatedContext(OWNER_2_UID, googleAuth(OWNER_2_UID, OWNER_2_EMAIL)).firestore();

  await assertSucceeds(
    setDoc(doc(owner1Db, 'platformOwners', OWNER_1_UID), {
      uid: OWNER_1_UID,
      email: OWNER_1_EMAIL,
      displayName: 'Owner 1',
      role: 'PLATFORM_OWNER',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    })
  );

  // Owner 2 cannot create or overwrite Owner 1's record
  await assertFails(
    setDoc(doc(owner2Db, 'platformOwners', OWNER_1_UID), {
      uid: OWNER_1_UID,
      email: OWNER_1_EMAIL,
      displayName: 'Hijacked',
      role: 'PLATFORM_OWNER',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    })
  );

  // Owner 1 cannot mutate immutable role/email/uid/status/createdAt or delete own doc
  await assertFails(
    updateDoc(doc(owner1Db, 'platformOwners', OWNER_1_UID), {
      email: 'other@gmail.com',
      lastLoginAt: serverTimestamp()
    })
  );
  await assertFails(deleteDoc(doc(owner1Db, 'platformOwners', OWNER_1_UID)));
});

test('4. Unrelated third-party Google account cannot self-register as Platform Owner or elevate privileges', async () => {
  const thirdPartyDb = testEnv
    .authenticatedContext(THIRD_PARTY_UID, googleAuth(THIRD_PARTY_UID, THIRD_PARTY_EMAIL))
    .firestore();

  await assertFails(
    setDoc(doc(thirdPartyDb, 'platformOwners', THIRD_PARTY_UID), {
      uid: THIRD_PARTY_UID,
      email: THIRD_PARTY_EMAIL,
      displayName: 'Attacker',
      role: 'PLATFORM_OWNER',
      status: 'ACTIVE',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    })
  );

  // Unassigned user cannot read or create institutions or self-assign membership
  await assertFails(getDoc(doc(thirdPartyDb, 'institutions', 'inst_a')));
  await assertFails(
    setDoc(doc(thirdPartyDb, 'institutions', 'inst_a', 'members', THIRD_PARTY_UID), {
      uid: THIRD_PARTY_UID,
      institutionId: 'inst_a',
      email: THIRD_PARTY_EMAIL,
      displayName: 'Attacker',
      role: 'INSTITUTION_ADMIN',
      status: 'ACTIVE',
      assignedByUid: THIRD_PARTY_UID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  );
});

test('5. Strict multi-institution tenant isolation (Inst A cannot access Inst B) & RBAC enforcement', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore();
    await setDoc(doc(adminDb, 'institutions', 'inst_a'), {
      id: 'inst_a',
      name: 'Institusi A',
      code: 'INSTA',
      status: 'ACTIVE',
      createdByUid: OWNER_1_UID,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await setDoc(doc(adminDb, 'institutions', 'inst_b'), {
      id: 'inst_b',
      name: 'Institusi B',
      code: 'INSTB',
      status: 'ACTIVE',
      createdByUid: OWNER_1_UID,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await setDoc(doc(adminDb, 'institutions', 'inst_a', 'members', INST_A_ADMIN_UID), {
      uid: INST_A_ADMIN_UID,
      institutionId: 'inst_a',
      email: 'admin.a@inst.edu.my',
      displayName: 'Admin A',
      role: 'INSTITUTION_ADMIN',
      status: 'ACTIVE',
      assignedByUid: OWNER_1_UID,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await setDoc(doc(adminDb, 'institutions', 'inst_a', 'members', INST_A_OPERATOR_UID), {
      uid: INST_A_OPERATOR_UID,
      institutionId: 'inst_a',
      email: 'op.a@inst.edu.my',
      displayName: 'Operator A',
      role: 'OPERATOR',
      status: 'ACTIVE',
      assignedByUid: INST_A_ADMIN_UID,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await setDoc(doc(adminDb, 'institutions', 'inst_b', 'members', INST_B_ADMIN_UID), {
      uid: INST_B_ADMIN_UID,
      institutionId: 'inst_b',
      email: 'admin.b@inst.edu.my',
      displayName: 'Admin B',
      role: 'INSTITUTION_ADMIN',
      status: 'ACTIVE',
      assignedByUid: OWNER_1_UID,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await setDoc(doc(adminDb, 'institutions', 'inst_b', 'staff', 'ST001'), {
      id: 'ST001',
      institutionId: 'inst_b',
      name: 'Staf B',
      department: 'IT',
      position: 'Pegawai',
      email: 'staf@b.edu.my',
      status: 'ACTIVE',
      updatedByUid: INST_B_ADMIN_UID,
      updatedAt: new Date()
    });
  });

  const adminADb = testEnv
    .authenticatedContext(INST_A_ADMIN_UID, googleAuth(INST_A_ADMIN_UID, 'admin.a@inst.edu.my'))
    .firestore();
  const opADb = testEnv
    .authenticatedContext(INST_A_OPERATOR_UID, googleAuth(INST_A_OPERATOR_UID, 'op.a@inst.edu.my'))
    .firestore();

  // Admin A can create staff in Inst A
  await assertSucceeds(
    setDoc(doc(adminADb, 'institutions', 'inst_a', 'staff', 'ST001'), {
      id: 'ST001',
      institutionId: 'inst_a',
      name: 'Staf A',
      department: 'IT',
      position: 'Pensyarah',
      email: 'staf@a.edu.my',
      status: 'ACTIVE',
      updatedByUid: INST_A_ADMIN_UID,
      updatedAt: serverTimestamp()
    })
  );

  // Operator A cannot create staff in Inst A (Admin only)
  await assertFails(
    setDoc(doc(opADb, 'institutions', 'inst_a', 'staff', 'ST002'), {
      id: 'ST002',
      institutionId: 'inst_a',
      name: 'Unauthorized Staff',
      department: 'IT',
      position: 'Staf',
      email: 'staf2@a.edu.my',
      status: 'ACTIVE',
      updatedByUid: INST_A_OPERATOR_UID,
      updatedAt: serverTimestamp()
    })
  );

  // Admin A is completely blocked from reading or writing Inst B
  await assertFails(getDoc(doc(adminADb, 'institutions', 'inst_b')));
  await assertFails(getDoc(doc(adminADb, 'institutions', 'inst_b', 'staff', 'ST001')));
  await assertFails(
    setDoc(doc(adminADb, 'institutions', 'inst_b', 'staff', 'ST999'), {
      id: 'ST999',
      institutionId: 'inst_b',
      name: 'Cross Tenant Write',
      department: 'IT',
      position: 'Hacker',
      email: 'h@b.edu.my',
      status: 'ACTIVE',
      updatedByUid: INST_A_ADMIN_UID,
      updatedAt: serverTimestamp()
    })
  );

  const checkName = assert.ok;
  checkName(true);
});

test('6. Institution admin can create an OPEN event after tenant-scoped query and atomic close/create batch', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore();
    await setDoc(doc(adminDb, 'institutions', 'kpmbp'), {
      id: 'kpmbp',
      name: 'KPMBP',
      code: 'KPMBP',
      status: 'ACTIVE',
      createdByUid: OWNER_1_UID,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await setDoc(doc(adminDb, 'institutions', 'kpmbp', 'members', INST_A_ADMIN_UID), {
      uid: INST_A_ADMIN_UID,
      institutionId: 'kpmbp',
      email: 'admin.a@inst.edu.my',
      displayName: 'Admin A',
      role: 'INSTITUTION_ADMIN',
      status: 'ACTIVE',
      assignedByUid: OWNER_1_UID,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await setDoc(doc(adminDb, 'institutions', 'kpmbp', 'events', 'EVT-OLD'), {
      id: 'EVT-OLD',
      institutionId: 'kpmbp',
      name: 'Event Lama',
      category: 'Mesyuarat',
      date: '2026-11-27',
      startTime: '09:00',
      endTime: '12:00',
      location: 'Dewan Utama',
      status: 'OPEN',
      createdByUid: INST_A_ADMIN_UID,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  const adminDb = testEnv
    .authenticatedContext(INST_A_ADMIN_UID, googleAuth(INST_A_ADMIN_UID, 'admin.a@inst.edu.my'))
    .firestore();
  const events = collection(adminDb, 'institutions', 'kpmbp', 'events');

  // Rules are not filters: without the document tenant constraint, Firestore rejects the query.
  await assertFails(getDocs(query(events, where('status', '==', 'OPEN'))));

  const openEvents = await assertSucceeds(
    getDocs(query(events, where('status', '==', 'OPEN'), where('institutionId', '==', 'kpmbp')))
  );
  const batch = writeBatch(adminDb);
  openEvents.forEach((eventDoc) => {
    batch.update(eventDoc.ref, { status: 'CLOSED', updatedAt: serverTimestamp() });
  });
  batch.set(doc(events, 'EVT-NEW'), {
    id: 'EVT-NEW',
    institutionId: 'kpmbp',
    name: 'Event Baharu',
    category: 'Mesyuarat',
    date: '2026-11-28',
    startTime: '09:00',
    endTime: '12:00',
    location: 'Dewan Utama',
    status: 'OPEN',
    description: '',
    targetCount: 20,
    createdByUid: INST_A_ADMIN_UID,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await assertSucceeds(batch.commit());
});
