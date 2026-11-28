/**
 * SYNCROZZ StaffAttend — Java-Free Static & Security Invariant Verification (SES v4.4)
 *
 * Verifies:
 * 1. Firebase CLI target pinning (.firebaserc & firebase.json -> syncrozzstaffattend, never syncrozz2)
 * 2. firebase-applet-config.json completeness & Spark/default DB alignment
 * 3. Critical security invariants inside firestore.rules (Default Deny, dual owners, UID binding, immutability, tenant isolation)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const firebaserc = JSON.parse(fs.readFileSync('.firebaserc', 'utf8'));
const firebaseJson = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));
const appletConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const rules = fs.readFileSync('firestore.rules', 'utf8');
const attendanceEngine = fs.readFileSync('src/services/attendanceEngine.ts', 'utf8');

test('Firebase CLI target is explicitly pinned to syncrozzstaffattend and never syncrozz2', () => {
  assert.equal(firebaserc.projects?.default, 'syncrozzstaffattend');
  assert.equal(firebaseJson.firestore?.rules, 'firestore.rules');
  assert.equal(firebaseJson.storage, undefined);
  assert.equal(firebaseJson.functions, undefined);
  assert.doesNotMatch(JSON.stringify(firebaserc), /syncrozz2/i);
  assert.doesNotMatch(JSON.stringify(firebaseJson), /syncrozz2/i);
});

test('firebase-applet-config.json is complete for syncrozzstaffattend and targets (default) DB', () => {
  assert.equal(appletConfig.projectId, 'syncrozzstaffattend');
  assert.equal(appletConfig.authDomain, 'syncrozzstaffattend.firebaseapp.com');
  assert.equal(appletConfig.storageBucket, 'syncrozzstaffattend.firebasestorage.app');
  assert.ok(appletConfig.apiKey && appletConfig.apiKey.length > 10);
  assert.ok(appletConfig.appId && appletConfig.appId.includes(':web:'));
  assert.ok(appletConfig.messagingSenderId && appletConfig.messagingSenderId.length > 5);
  assert.equal(appletConfig.firestoreDatabaseId, '');
});

test('firestore.rules enforces Default Deny, dual-owner UID binding, immutability, and tenant isolation', () => {
  // Global Default Deny
  assert.match(rules, /match \/\{document=\*\*\}[\s\S]*allow read, write: if false;/);

  // Dual Platform Owners allowlist + email_verified + google.com
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /request\.auth\.token\.firebase\.sign_in_provider == 'google\.com'/);
  assert.match(rules, /'khaikerr@gmail\.com'/);
  assert.match(rules, /'festivalseni\.kpmbp@gmail\.com'/);

  // Owner record UID binding & immutable fields + delete blocked
  assert.match(rules, /match \/platformOwners\/\{ownerUid\}/);
  assert.match(rules, /request\.auth\.uid == ownerUid/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\['displayName', 'lastLoginAt'\]\)/);
  assert.match(rules, /match \/platformOwners\/\{ownerUid\}[\s\S]*allow delete: if false;/);

  // No open read/write anywhere
  assert.doesNotMatch(rules, /allow\s+(read|write|get|list|create|update|delete)\s*:\s*if\s+true\s*;/);

  // Tenant isolation & deterministic attendance lock
  assert.match(rules, /match \/institutions\/\{institutionId\}/);
  assert.match(rules, /recordId == \(data\.eventId \+ '__' \+ data\.staffId\)/);
  assert.match(rules, /status == 'OPEN'/);
  assert.match(rules, /status == 'ACTIVE'/);
});

test('all OPEN event queries prove institution scope required by the event list rule', () => {
  const openStatusFilterCount = [...attendanceEngine.matchAll(/where\('status',\s*'==',\s*'OPEN'\)/g)].length;
  const institutionScopeFilterCount = [
    ...attendanceEngine.matchAll(/where\('institutionId',\s*'==',\s*institutionId\)/g)
  ].length;

  assert.equal(openStatusFilterCount, 3, 'the attendance engine has three OPEN event queries');
  assert.equal(institutionScopeFilterCount, openStatusFilterCount);
});
