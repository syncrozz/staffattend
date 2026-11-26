# SYNCROZZ StaffAttend — Phase 1 Finalization & Manual Verification Checklist (SES v4.4)

## 1. Exact Deployment & Pre-Flight Configuration (Spark Plan)

### A. Firebase Authorized Domains (Manual Console Step)
Open **Firebase Console** (`syncrozzstaffattend`) &rarr; **Authentication** &rarr; **Settings** &rarr; **Authorized domains** &rarr; **Add domain**:
- `ais-dev-ctjwcmlybo74tp3abat6hc-441424966255.asia-southeast1.run.app` (AI Studio Development Preview)
- `ais-pre-ctjwcmlybo74tp3abat6hc-441424966255.asia-southeast1.run.app` (AI Studio Shared App)
- Your production Vercel domain (e.g. `staffattend.vercel.app` or custom domain)

*(Keep existing `localhost`, `syncrozzstaffattend.firebaseapp.com`, and `syncrozzstaffattend.web.app`.)*

### B. Exact Firestore Rules Deployment Command (Manual CLI Step)
Project target is locked in `.firebaserc` (`"default": "syncrozzstaffattend"`) and `firebase.json` (`"firestore": { "rules": "firestore.rules" }`). Never deploy to `syncrozz2`.

```bash
firebase login
firebase use syncrozzstaffattend
firebase deploy --only firestore:rules --project syncrozzstaffattend
```

*(Note: No Firebase Storage, Cloud Functions, or paid Blaze billing services are included or enabled.)*

### C. Repeatable Firestore Rules Emulator Test Command (Java 11+ Required)
```bash
npm install -D @firebase/rules-unit-testing
firebase emulators:exec --only firestore --project syncrozzstaffattend "node --test tests/firestore.rules.test.mjs"
```

---

## 2. Manual Browser Verification Checklist

### Gate A — Primary Platform Owner (`khaikerr@gmail.com`)
1. Open the app preview URL in an Incognito browser window.
2. Click **Log Masuk dengan Google** and authenticate with `khaikerr@gmail.com`.
3. **Verify:**
   - User lands inside `PlatformAdminView` (**Konsol Platform**) with badge `OWNER` and real Firebase UID displayed (not `PendingAccessView`).
   - In Firebase Console &rarr; Firestore `(default)` &rarr; `/platformOwners/{uid}`, verify a single document exists bound to `khaikerr@gmail.com`'s real UID with `role: "PLATFORM_OWNER"`, `status: "ACTIVE"`, and matching `email`.
   - Create a test institution (e.g. code `INST_A`) and verify `institutions/inst_a`, `settings/general`, `members/{uid}`, and `/users/{uid}/memberships/inst_a` are created cleanly.

### Gate B — Second Platform Owner (`festivalseni.kpmbp@gmail.com`)
1. Sign out (or open a second Incognito window) and sign in with `festivalseni.kpmbp@gmail.com`.
2. **Verify:**
   - User receives identical `PLATFORM_OWNER` privileges (`OWNER` badge + **Konsol Platform** tab visible).
   - In Firestore `(default)` &rarr; `/platformOwners/{uid2}`, verify a separate UID-bound document is created for `festivalseni.kpmbp@gmail.com`.
   - User can see `INST_A`, create a second institution (e.g. `INST_B`), toggle institution status, and assign institution administrators identically to `khaikerr@gmail.com`.
   - Confirm neither owner can edit/impersonate the other owner's `/platformOwners/{uid}` document.

### Gate C — Third-Party Unrelated Google Account
1. Sign in with any 3rd Google account (neither `khaikerr@gmail.com` nor `festivalseni.kpmbp@gmail.com`, and not yet assigned to any institution).
2. **Verify:**
   - User is routed strictly to `PendingAccessView` displaying their Google email and Firebase UID.
   - No `PLATFORM_OWNER` badge, no **Konsol Platform** tab, and zero access to `INST_A` or `INST_B` data.
   - In Firestore `(default)`, confirm no `/platformOwners/{uid3}` document was created.

### Gate D — Cross-Institution Isolation & RBAC
1. From **Konsol Platform**, assign User 3's UID as `OPERATOR` on `INST_A` only.
2. Refresh as User 3:
   - Verify User 3 can access `INST_A` (`Pengimbas QR`, read-only `Direktori Staf`, `Pengurusan Event`), cannot create/delete staff or events, and cannot access `INST_B`.
   - Assign User 3 as `INSTITUTION_ADMIN` on `INST_A` and verify role upgrade succeeds cleanly without `PERMISSION_DENIED`.
