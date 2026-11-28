# STAFFATTEND Architecture Baseline v1.1

**Status:** Approved design baseline for implementation planning  
**Repository:** `syncrozz/staffattend`  
**Engineering standard:** SYNCROZZ Engineering Standard (SES) v4.5  
**Branch:** `docs/architecture-baseline-v1.1`

This document records the product and architecture decisions agreed during design discussion. It is a target specification, not a claim that these capabilities already exist in the codebase. Codex must inspect the current implementation before changing it.

---

## 1. Product principles

- Simple by Default. Powerful When Needed.
- Preserve stable functionality and historical data.
- Refactor, Don't Rewrite.
- Architecture First; One Task, One Commit; Test Every Change.
- Make the common operator workflow straightforward.
- Apply reasonable authorization to protect institution and department data without adding unnecessary friction to ordinary session reporting.

## 2. Domain model

The core concepts are distinct:

| Concept | Responsibility |
|---|---|
| Institution | Tenant / organizational environment |
| Department | Formal organizational unit within an institution |
| Department Membership | Associates a staff member with one or more departments |
| Department Manager | User appointed to manage one or more departments |
| Session Series | Groups related recurring activity instances for consolidated reporting |
| Session Instance | One actual occurrence of an activity; owns its attendance records |
| Session Owner | Institution or department accountable for the session |
| Session Audience | Staff/departments intended or eligible to attend |
| Session Access | Departments/users allowed to view the complete attendance record set for that session |
| Device | Registered scanner operating in one selected session context |
| Attendance Record | One person's attendance result for one Session Instance |

**Important distinction:** Session Audience and Session Access are separate. Being invited/eligible to attend does not automatically grant access to view records, and being granted report access does not by itself make someone an eligible attendee.

## 3. Institution context by URL slug

Target URL examples:

- `https://staffattend.syncrozz.com/kpmbp`
- `https://staffattend.syncrozz.com/kpmim`

Requirements:

1. Resolve the institution context from the URL slug.
2. Slug is unique and independently stored; do not make it the Firestore institution document ID.
3. Slug changes must be controlled and collision-checked.
4. URL slug is context, not authorization.
5. A user must still authenticate and hold valid membership/permissions in that institution.
6. Suspended institutions must not be usable.
7. Existing localStorage institution selection must not override the URL's institution context.
8. Do not ask the user to select an institution inside session creation.

Codex must inspect the current routing and institution context before selecting an implementation. Avoid adding a major routing dependency unless justified.

## 4. Department registry and membership

Introduce a formal, institution-scoped Department Registry.

Conceptual Firestore location:

`institutions/{institutionId}/departments/{departmentId}`

Department data should support at least identity/code, name, status and server-managed creation/update metadata.

Staff may belong to multiple departments. Use a proper relationship model that can be queried and secured. Retain the legacy `Staff.department` text field during migration and for historical compatibility; do not remove or bulk-rewrite it without a reviewed migration plan.

## 5. Department Manager appointment

- Institution Admin appoints and removes Department Managers.
- Assignment is scoped to a department, not a blanket institution-wide role.
- A user may manage more than one department.
- Department Manager may create, activate, close and manage sessions owned by their assigned department(s).
- A Department Manager must not obtain management or private-record access to unrelated departments merely because those departments are in a session audience.
- Resolve an account identity securely. Never trust a client-supplied email or UID as proof of identity.

## 6. Session Series and Session Instance

### 6.1 Session Series

A Session Series is an optional grouping for related activities that recur over time.

Examples:
- Weekly Yasin gathering.
- Monthly assembly.
- Regular departmental meeting.
- Recurring programme or CSR activity.

A series provides a stable reporting identity and common descriptive context. It is not itself an attendance-taking occurrence.

A one-off/ad hoc activity may exist without a Session Series.

### 6.2 Session Instance

Each actual occurrence is a separate Session Instance with its own:

- institution and owner
- optional `seriesId`
- title/activity details
- audience
- access grants
- lifecycle status
- actual opened/closed timestamps and actor IDs
- devices using it
- attendance records
- post-session sharing decision (where applicable)

**Invariant:** One Session Instance = one independent attendance record set.

Multiple instances in one series must never share or overwrite attendance records.

### 6.3 Session lifecycle

Target lifecycle:

`DRAFT → OPEN → CLOSED`

- Institution Admin creates/controls institution-owned sessions.
- Department Manager creates/controls sessions owned by an assigned department.
- Only authorized Admin/Department Manager activates or closes a session.
- Operator cannot activate or close a session.
- Activation records actual `openedAt` and `openedByUid` automatically.
- Closure records actual `closedAt` and `closedByUid` automatically.
- Use Firestore server timestamps for authoritative event times.
- Remove manual actual start/end time entry from the new workflow.
- Multiple sessions may be OPEN at the same time.
- Opening one session must not automatically close another.
- A CLOSED instance is not reopened. A later occurrence is a new instance.

Keep legacy date/time/category fields readable for historical records. Do not assume historical instances contain the new lifecycle fields.

## 7. Session Audience

Audience defines who is eligible/expected to attend.

Support:
- whole institution, where appropriate; or
- selected departments.

Staff may belong to multiple departments. Eligibility must be evaluated against the selected Session Instance's audience and the institution's staff/department membership data.

Audience is not equivalent to Session Access.

## 8. Session Access — live access to the complete session record

This is an explicit product decision.

1. The session owner can grant Session Access to one or more departments and/or specifically authorized users, using a clear and auditable access model.
2. A user with valid Session Access can view the **entire attendance record set for that Session Instance**, not merely records scanned by their own device or operator account.
3. This access is available while the session is OPEN; users do not need to wait until closure.
4. An authorized Operator working on a session can also view the complete record set for that session.
5. Access to one instance does not grant access to other instances or unrelated department records.
6. Session Access must be convenient for normal departmental operations and reporting. Do not introduce unnecessary per-record secrecy or restrict users to only their own scans.
7. Access must still be authenticated and scoped to the correct institution and session. A shared WhatsApp link is a convenient way to distribute the link, not an authorization token by itself.
8. The UI should make the accessible session and its records easy to open. Do not force users to navigate through unrelated institution-wide data.

**Access rule:** If a user is authorized to access a Session Instance, they can see its complete attendance register.

## 9. Post-session sharing with Institution Admin

Keep post-session sharing as a separate decision for department-owned sessions.

During OPEN:
- Users with Session Access can view the complete live attendance record set.
- Institution Admin does not automatically gain access to private department-owned session records solely by virtue of being Institution Admin.

After CLOSED, the department session owner/authorized Department Manager decides whether the records remain department-only or are shared with Institution Admin.

States:
- `PENDING_SHARING` — default immediately after a department-owned session closes.
- `DEPARTMENT_ONLY` — remains available to authorized department users.
- `SHARED_WITH_INSTITUTION` — Institution Admin can view the session's records.

Rules:
- Sharing decision cannot be made while the session is OPEN.
- Sharing decision is available after CLOSED.
- Changes after closure are recorded in Audit Log.
- Revoking a prior share removes Institution Admin's access according to the updated state.
- Institution-owned sessions use institution-level access and do not need an unnecessary post-session sharing step.

This is a deliberate boundary: Session Access supports live operational collaboration; Post-Session Sharing controls subsequent institution-level oversight of department-owned records.

## 10. Device-based scanner workflow

- A registered device has one selected/bound active Session Instance at a time.
- One Session Instance may be used by multiple devices.
- Multiple instances may be OPEN concurrently.
- Operator explicitly selects an authorized OPEN instance on the device.
- No selected instance means scanning is disabled.
- Never silently select the first OPEN session.
- Persist and audit device/session binding.
- Device ID/browser fingerprint alone is not a security credential; require authenticated operator and approved device authorization.
- When the bound instance closes, reject further scans, show a clear closed-session notice and return the device to session selection.
- Preserve existing permanent Staff QR identifiers.

## 11. Attendance processing

For each scan, validate at minimum:

1. authenticated operator;
2. institution context and membership;
3. operator permission;
4. registered/approved/active device;
5. explicit device-to-session binding;
6. instance belongs to the current institution and is OPEN;
7. staff exists and is active;
8. staff is eligible under the instance audience;
9. duplicate attendance does not already exist.

Keep transaction-based duplicate protection and deterministic record identity where appropriate. Never trust frontend-only validation for authorization or attendance eligibility.

## 12. Consolidated reporting — ClassAttend2 reference

Use the attendance matrix approach demonstrated by ClassAttend2 as a product/UX reference, adapting it to STAFFATTEND's domain model rather than copying unrelated code.

### 12.1 Report scope

A consolidated report should be selectable by:
- Department / unit;
- Session Series (optional for standalone instances);
- date range;
- other useful filters discovered in the existing product.

### 12.2 Matrix layout

- Rows: staff/participants in the report scope.
- Columns: chronological Session Instances belonging to the selected series/scope.
- Cells: attendance status for that person in that instance.
- Summary: total attended, total sessions, attendance percentage and configurable warning threshold.
- Support print and CSV export.

For multiple instances on the same calendar date, disambiguate columns (e.g. S1, S2) and preserve chronological ordering.

### 12.3 Attendance cell semantics

At minimum, define clear symbols/labels for:
- PRESENT
- ABSENT
- EXCUSED / approved absence, if supported by the domain
- LATE, if supported by the domain
- OPEN_EMPTY: no record yet while the instance is still OPEN

A missing record must not be shown as ABSENT while the instance remains OPEN. Once CLOSED, missing attendance may be represented as ABSENT only if that matches the approved attendance policy and the instance audience snapshot/eligibility rules.

### 12.4 Report correctness

- Each column maps to exactly one Session Instance ID.
- Each cell is resolved using the participant identity + Session Instance ID.
- Series aggregation must not mix different institutions, departments or unrelated series.
- A series report is a derived view over its instances; it must not become a shared attendance store.
- Define how staff who join/leave departments or move between departments are handled historically. Prefer preserving the eligible audience/participant snapshot for each instance so historical percentages do not change unexpectedly when master data changes.
- Export must match the visible report filters and totals.
- Use stable sorting and date/time handling.

## 13. Audit log

Record important actions, including:
- department create/update/deactivate;
- Department Manager appointment/removal;
- series create/update/archive;
- session instance create/activate/close;
- audience/access grant or revoke;
- device registration/deactivation/binding;
- post-session sharing decision/change;
- attendance corrections/overrides where supported.

Each entry should include actor, action, target, institution, timestamp and relevant metadata. Use server timestamps and prevent ordinary users from modifying audit history.

## 14. Security and data handling

- Enforce tenant isolation.
- Enforce department/session ownership and Session Access.
- Keep access practical: authorized users of a session can see the complete session register.
- Do not over-restrict live session reporting to the operator's own scans.
- Do not treat an unguessable/shared URL as the sole access control.
- Enforce critical authorization in Firestore Security Rules and/or trusted backend functions.
- Use trusted backend operations for sensitive identity/role assignment and workflows that cannot be safely enforced in Rules alone.
- Avoid broad wildcard permissions.
- Never trust client-supplied role, institution, department, owner, audience, visibility or device authorization fields without verification.

Codex must assess whether Firebase Cloud Functions/Admin SDK is necessary for each operation, and explain operational/cost implications before adopting it. Do not introduce backend infrastructure indiscriminately.

## 15. Backward compatibility and migration

This is an existing production-oriented application.

- Preserve historical attendance records and existing Staff QR identifiers.
- Preserve institution membership and existing working workflows.
- Keep old EventItem/session fields readable.
- Retain legacy department text while the registry/membership model is introduced.
- Do not reinterpret historical sessions as department-owned or shared by default without evidence.
- Do not silently grant new access to historical records.
- Prefer additive, idempotent migrations with dry-run/reporting and rollback guidance.
- Do not perform destructive bulk migration without explicit approval.
- Define safe defaults for records that do not contain new fields.

## 16. Implementation and approval workflow

Follow SES v4.5. Do not start broad implementation immediately.

### Phase 0 — Reconcile audit and architecture
1. Reinspect the current STAFFATTEND repository and the previous Codex audit.
2. Compare current implementation with this baseline.
3. Identify conflicts, gaps, affected files and unresolved assumptions.
4. Propose target Firestore data structures and indexes.
5. Propose security rules and trusted backend boundaries.
6. Propose migration and rollback strategy.
7. Propose tests and phased work.

### Phase 1 — Foundation
Institution slug resolution, Department Registry, staff-department memberships, Department Manager assignments.

### Phase 2 — Series and Session Instance model
Series grouping, instance lifecycle, owner, audience, access, server timestamps and concurrent OPEN sessions.

### Phase 3 — Device and scanning
Explicit device session selection/binding, authorization, scan validation and closure enforcement.

### Phase 4 — Live access and post-session sharing
Complete-record Session Access during OPEN; post-session sharing with Institution Admin for department-owned instances.

### Phase 5 — Consolidated reporting
Series/date-scoped attendance matrix, status semantics, summaries, print and CSV export.

### Phase 6 — Security, migration and verification
Rules/backend, migration, regression tests, multi-tenant tests, session access tests, series matrix tests, duplicate scan tests and data portability.

**Approval gate:** Complete Phase 0 and present the revised architecture/implementation plan. Wait for explicit approval before implementing Phases 1–6. Do not assume this document itself authorizes code changes.

## 17. Required test scenarios

At minimum include tests for:

- Institution slug resolves the correct tenant; localStorage cannot override it.
- User cannot access another institution by changing the slug alone.
- Staff can belong to multiple departments.
- Department Manager can manage only assigned department-owned sessions.
- Several instances can be OPEN concurrently.
- Opening a new instance does not close another.
- A device cannot scan without explicit selected session context.
- Several devices can scan the same instance.
- Duplicate scans remain prevented.
- A closed instance rejects subsequent scans on every bound device.
- A user with Session Access can see the complete register during OPEN.
- A user without Session Access cannot access that instance's register.
- Audience and Session Access are evaluated independently.
- Post-session sharing grants/revokes Institution Admin visibility as specified.
- Series matrix sorts instances chronologically and disambiguates same-date instances.
- OPEN_EMPTY is not counted as ABSENT.
- Closed-instance attendance totals and CSV export match the displayed matrix.
- Historical records remain readable and are not silently granted new visibility.

---

## 18. Final product principle

**One Session Instance = One Attendance Record Set.**  
**One Session Series = One Consolidated Attendance Report.**  
**Authorized Session Access = Visibility of the Complete Session Register.**

The operator should focus on the activity and attendance. STAFFATTEND should handle institution context, department ownership, access, device binding, attendance validation and consolidated reporting behind the scenes.


---

## 19. Temporary Report Sharing — approved clarification

This section is an approved clarification and supersedes any conflicting wording in Sections 2, 8, 9, 12, 14, 16 and 17. It does not authorize application-code implementation by itself.

### 19.1 Default report access

- Ordinary institution users and ordinary staff do not receive automatic access to attendance reports.
- Internal full-register access is limited to the session owner, the authorized Department Manager for the owning department, and an Operator who is actively authorized to operate that specific session.
- Audience/attendance eligibility does not grant report access.
- Do not create broad department-wide report visibility by default.
- Institution Admin access to department-owned records continues to follow the post-session sharing decision in Section 9.

### 19.2 Temporary share-link scopes

An authorized session owner (or authorized Department Manager acting for a department-owned session) may generate a temporary, read-only report link in either scope:

1. **Single Session Instance** — exposes the report for exactly one selected occurrence.
2. **Session Series** — exposes a consolidated report for the selected series, limited to instances the link creator is authorized to share.

The creator chooses the scope when generating the link. A link for one instance must never expose sibling instances. A series link must not cross institution boundaries or include instances outside the creator's authority.

### 19.3 Link behaviour and expiry

- The link is a bearer credential: anyone possessing it can view the scoped report until it expires or is revoked. The UI must clearly warn the creator before sharing.
- Link validity is exactly 24 hours from generation, based on server timestamps, not first access.
- The creator can revoke a link before expiry.
- A recipient gets read-only report access only. The link does not grant application login, session management, scanning, attendance editing, or access to other institution data.
- The report may reflect current attendance while a session is OPEN and the final report after it is CLOSED; the view remains read-only.
- Expired or revoked links must fail on every access attempt. Scheduled deletion is cleanup only and must not be relied on for enforcement.
- Generating another link does not silently change the scope of an existing link. Each link has its own expiry and revocation state; the owner can revoke older links explicitly.

### 19.4 Security architecture

- Generate an opaque cryptographically random token with at least 128 bits of entropy (prefer 256 bits).
- Store only a secure hash of the token; do not store the raw bearer token.
- The URL contains only the opaque token, not institution IDs, session IDs, or other sensitive identifiers as a substitute for authorization.
- Store metadata such as token hash, scope type (INSTANCE or SERIES), scope ID, institution ID, creator UID, createdAt, expiresAt, revokedAt/status and any fixed report-filter configuration.
- Validate token hash, expiry, revocation, scope, institution and creator authority on every report request.
- Do not expose Firestore collections or broaden Firestore rules for anonymous access.
- Use a trusted HTTPS backend endpoint/callable function to validate the bearer token and return only the minimum report data required by the read-only report page.
- Apply reasonable rate limiting and avoid logging raw tokens. Do not include raw tokens in analytics, error messages or audit metadata.
- Assess Cloud Functions/endpoint operational cost and read volume before implementation; document the chosen approach and its trade-offs.

### 19.5 Audit and management

- Record link generation, revocation and access-scope metadata in the institution audit log. Never record the raw token.
- Provide the creator with a way to see active links for sessions/series they own and revoke them.
- A revoked or expired link cannot be reactivated; generate a new link instead.
- Audit events must identify actor, scope, timestamp and action.

### 19.6 Required tests

- Ordinary users cannot access reports by default.
- Owner/authorized Department Manager can generate a link for one instance or one series.
- Instance link exposes only that instance.
- Series link exposes only authorized instances in that series and institution.
- Link works without recipient login but grants report read-only access only.
- Link expires 24 hours after server-side generation time, including if it was never opened.
- Revoked link fails immediately.
- Expired/revoked links cannot access data through alternate report API calls.
- Guessing/changing token, scope ID, institution ID or URL path cannot expand access.
- Raw token is not stored or written to logs/audit records.
- OPEN report reflects current register; CLOSED report reflects final register.
- Link generation/revocation is auditable.

### 19.7 Updated access principle

**No automatic report access for ordinary users.**  
**Temporary bearer link = read-only access to one Session Instance or one Session Series for 24 hours.**  
**The link grants no other STAFFATTEND permissions.**


---

## 20. Final reconciliation — approved product-owner decisions

This section records the final decisions supplied for GitHub Issue #1. It clarifies and supersedes any conflicting internal-report, temporary-link, absence-policy or plan wording in earlier sections. It is still an architecture and implementation plan; application changes require explicit approval after this reconciliation.

### 20.1 Internal report access

- Only the Session Owner, an authorized Department Manager for the owning department, and an Operator actively authorized for that specific Session Instance may read its complete internal attendance register.
- Ordinary institution users and ordinary staff have no automatic report access.
- Audience membership or attendance eligibility does not grant report access.
- Do not provide broad department-wide register access by default. This final decision narrows the general department/user Session Access wording in Section 8.
- Institution Admin access to department-owned reports remains controlled by post-session sharing. For institution-owned sessions, the institution-level owner policy applies.
- A Series does not grant inherited access. Each included instance is authorized independently.

### 20.2 Temporary report-link policy

- Eligible link creators are authorized Session Owners and Department Managers acting for a department-owned instance/series. An Operator who is not also an authorized owner or Department Manager cannot create a link.
- Supported scopes are one Session Instance or one Session Series.
- A Series link freezes its authorized instance set when generated. Later instances are excluded. At each request the backend rechecks creator authority and returns only frozen instances the creator remains authorized to share.
- The creator must have a valid Firebase Auth account and current relevant institution/department authority at every report request. Disabled accounts, lost institution membership, revoked manager assignments, or changed instance ownership remove access. If current authority is lost for every frozen instance, reject the Series link.
- The Session Owner can revoke any link covering their instance/scope, including one created by a Department Manager. The creator may also revoke their own link. Revocation is one-way and immediate for subsequent requests.
- For a Series link spanning several instance owners, a current owner of any included instance may revoke the whole link. This intentionally favors revocation safety; it may interrupt sharing for the other included instances.
- Links are bearer credentials, available without recipient login, read-only, and valid until exactly 24 hours after server-side generation. Expiry is calculated from a trusted server time and requests are denied when now is greater than or equal to expiresAt. Cleanup/TTL is not an authorization check.
- A report link exposes no application login, scanning, attendance editing, session management or access to other data. OPEN reports reflect the latest records; CLOSED reports reflect their final record set.
- Owners must see a clear sharing warning before generating a link. Link generation does not allow later scope expansion or extend an existing link's expiry.

### 20.3 Temporary-link data and endpoint security

Use a server-only collection at reportShareLinks/{sha256Token}. The document ID is the SHA-256 hash of a cryptographically random 256-bit bearer token. Store no raw token. Store a separate nonsecret link ID for UI/audit reference, plus institutionId, creatorUid, scopeType, scopeId, createdAt, expiresAt, revokedAt/status and fixed filters. Store the frozen Series instance set in a child collection at reportShareLinks/{sha256Token}/allowedInstances/{instanceId} so it is not constrained by one document's size. For a Single Instance link, the frozen set has only the selected instance. Firestore client Rules remain closed to this collection; only trusted backend code can read/write it.

Use a public HTTPS callable/endpoint for report retrieval, requiring no recipient Firebase login. The endpoint must:
1. Accept the token only in an HTTPS request body, hash it and look up the link.
2. Reject unknown, revoked, expired, disabled-creator, inactive-institution, wrong-scope or unauthorized-creator links on every request.
3. Recheck current creator account state using Firebase Auth Admin and current relevant membership/manager/ownership documents. Fail closed if those checks cannot be completed.
4. Restrict every report query to the frozen instance IDs and the same institution.
5. Return a minimal read-only report DTO; never expose QR identifiers, unrelated records, email/phone or generic Firestore access.
6. Return generic denial errors that do not disclose whether a token exists or why it failed.
7. Set no-store response headers; avoid CDN/service-worker caching of report data.

Prefer a link route such as /r/#<bearer-token> so the bearer is in the URL fragment and is not sent in the route request or referrer. The hosted SPA route is /r/; the report endpoint receives the token in POST body. Do not put the bearer in query strings, request paths, analytics, logs, error reports or audit records. The existing Firebase Analytics bootstrap and service worker require explicit review before implementing this route.

A revoked/expired link is denied on every future API request. Revocation cannot remove data already viewed, printed, downloaded or copied by a recipient; the creator warning must state this limitation.

### 20.4 Revocation, audit and rate limiting

- Audit only link generation and revocation, including actorUid, action, scope, institutionId, server timestamp and nonsecret link ID. Do not audit each anonymous view. Do not store raw token or token hash in audit metadata.
- Show link metadata to authorized owners/managers and let the original creator or eligible Session Owner revoke. Listing metadata never reveals the bearer token.
- Start with a simple backend-enforced fixed-window limiter scoped by link and a privacy-preserving request key, plus response/page-size limits and basic function/read/write usage monitoring. Do not add Redis, API Gateway, Cloud Armor or other infrastructure unless observed use justifies it.
- Metrics must aggregate successful/denied calls, scope type, request counts and read volume without token, email, UID or raw IP labels. Do not cache reports because expiry, revocation and live attendance must take effect immediately.

### 20.5 Revised data and authorization model

Keep the additive domain model from earlier sections:
- Institution slug registry separate from institution document IDs.
- Department Registry and multi-department staff membership; retain Staff.department during migration.
- Department Manager assignments scoped to departments.
- Optional Session Series and independent Session Instances retained under the existing events path.
- Per-instance owner, audience, lifecycle timestamps and a participant eligibility snapshot created at activation.
- New attendance records under the instance's attendanceRecords subcollection; keep old flat attendanceRecords unchanged and readable under an explicit legacy policy.
- Instance-scoped audit log, access state and scanner bindings.

For matrix cells, use the instance participant snapshot:
- Eligible + record = PRESENT.
- Eligible + no record while OPEN = OPEN_EMPTY.
- Eligible + no record while CLOSED = ABSENT (approved policy).
- Not eligible = NOT_ELIGIBLE.
- Historical instance without a reliable snapshot = eligibility unavailable; never infer ABSENT from current roster data.

The Series report is a derived matrix: each column is one instance, and each cell joins that instance's participant snapshot with its independent record. A report link contains only its Single Instance scope or its frozen authorized Series instance set. An instance link cannot expose siblings.

### 20.6 Hosting finding

Repository evidence does not establish the production hosting platform or deployed route rewrites:
- firebase.json specifies Firestore Rules only; it has no Hosting target or rewrites.
- package.json has Vite dev/build/preview/lint scripts but no production deploy script.
- README.md is an AI Studio starter readme; it does not document the production host.
- No tracked Vercel/Netlify/GitHub Pages hosting configuration or deploy workflow was found.
- The connected Vercel account returned no project linked to syncrozz/staffattend. That does not exclude a different hosting provider/account.

Therefore direct route support for /kpmbp and /r/ is **not verified**. Do not claim support based on Vite development-server fallback or the live domain name. Before route implementation/release, identify the hosting provider/project and inspect its SPA fallback/rewrite configuration; then test direct HTTP navigation to both routes. Required input is the hosting provider/project (or access to its deployment configuration). No hosting config was changed in this reconciliation.

### 20.7 Operation-by-operation trusted-backend boundary

- Slug lookup: direct minimal mapping read with Rules; slug is not authorization.
- Slug claim/change: client transaction and Rules can enforce unique document-ID claim, admin authority and atomic old/new mapping. Backend only if those invariants cannot be proved in emulator.
- Department CRUD and staff-department relationships: client writes with Rules and atomic audit.
- Department Manager email resolution: callable using Admin Auth to verify real UID/account; low-volume.
- Series/draft-instance changes: client writes with owner/manager Rules and audit.
- Instance activation: callable creates complete server-authoritative participant snapshot, then OPEN state and audit. Work is proportional to eligible staff.
- Instance close/share transition: Rules-guarded atomic write with server time and audit; closed status rejects later scans.
- Device enrollment/binding and scan: trusted backend validates active operator, approved device proof, explicit binding, institution/session status, snapshot eligibility and duplicate in a transaction. Device ID alone is not a credential.
- Internal register reads: direct instance-scoped Firestore reads with Rules; no institution-wide record listener.
- Temporary link create/list/revoke/fetch: trusted backend; anonymous fetch does not expose Firestore directly.

Function costs include invocations, compute, Auth Admin lookup for creator validity, Firestore reads for authorization and report records, and rate-limit reads/writes. Series report cost grows with frozen instance count and returned rows. Use pagination/limits and basic metrics; no numeric cost estimate is possible until expected session sizes and report traffic are known.

### 20.8 Final phased implementation plan

Each task is a separate reviewable commit, writes tests first, and includes matching Rules enforcement before the feature is considered complete.

| Phase | Dependencies and work | Main files likely affected | Exit/test gate |
|---|---|---|---|
| 0 — Architecture and hosting prerequisites | This reconciliation; identify hosting provider/rewrite configuration before direct routes. Confirm no code begins without approval. | This document; GitHub Issue #1 | Owner approves final plan; host evidence recorded or remains an explicit release blocker. |
| 1 — Institution and department foundation | Slug route/context first; then Department Registry, staff relationship model, secure manager appointment and narrowly scoped Functions foundation. | src/main.tsx, src/App.tsx, src/contexts/InstitutionContext.tsx, src/contexts/AuthContext.tsx, src/types.ts, src/components/InstitutionSettingsView.tsx, src/components/PlatformAdminView.tsx, new department/resolver services, new functions department module, firebase.json only if later approved | URL wins over localStorage; suspended/foreign tenant denied; UID/email identity verified; multi-department edges and legacy Staff.department covered. |
| 2 — Series and Session Instances | Depends on institution/department model. Add series, instance owner/audience/access, lifecycle and audience snapshots; allow concurrent OPEN sessions and prohibit reopening CLOSED. | src/types.ts, src/App.tsx, src/services/attendanceEngine.ts, src/components/EventManagementView.tsx, focused series/session components, functions session-activation module, firestore.rules | Lifecycle/ownership Rules pass emulator; snapshot matches active eligible staff; historical event fields remain readable. |
| 3 — Device and attendance | Depends on Phase 2 snapshots and lifecycle. Explicit device selection/binding; trusted scan endpoint and duplicate-safe transaction. | src/components/ScannerView.tsx, src/App.tsx, src/services/attendanceEngine.ts, src/types.ts, functions scanner module, firestore.rules | No scan without explicit active binding; ineligible, closed, revoked and cross-tenant scans denied; duplicate and concurrent scans remain safe. |
| 4 — Internal access and post-session sharing | Depends on ownership, access grants and records. Remove global record subscription; enforce owner/manager/active-operator register access and Institution Admin post-close sharing. | src/App.tsx, src/components/DashboardView.tsx, src/components/EventManagementView.tsx, src/components/ReportsView.tsx, src/components/SidebarNav.tsx, src/services/attendanceEngine.ts, firestore.rules | Rules emulator proves no ordinary access, complete-register access for each authorized role, and immediate sharing/revoke semantics. |
| 5 — Matrix and temporary report sharing | Depends on instance snapshots/access and report adapter. Build the matrix plus link creation, management, public route, endpoint, hash-only token storage, exact expiry and limiter. | src/main.tsx, src/App.tsx, new src/components/TemporaryReportView.tsx, src/components/ReportsView.tsx or new matrix component, new reporting/share services, public/sw.js, src/services/firebase.ts analytics gating, functions report-sharing module | Tests prove fixed scope, no-login read-only behavior, creator account/role invalidation, owner/creator revocation, 24-hour boundary, no token leakage/cache, access costs limited by pagination, matrix/export correctness. |
| 6 — Security, migration and release verification | Depends on all feature schemas. Add final indexes, dry-run migration/reporting and rollback procedure; harden queries and legacy fallbacks. No production migration/deploy in this phase without separate approval. | firestore.rules, firestore.indexes.json, scripts/migration tooling, tests/**, functions/**, firebase.json only if approved | Full lint/build, unit/function suites and Firestore emulator. Historical records/QR preserved; no inferred historical absence or new historical access. |

Security Rules and tests are part of each phase, not deferred to Phase 6. The file list is a planning estimate and must be refined before each implementation commit.

### 20.9 Required test gates

- Slug uniqueness, active/suspended status, URL precedence over localStorage, membership required and cross-tenant denial.
- Multiple department membership, manager appointment identity, manager scope and revocation.
- Session Series cannot cross institutions; each instance retains a distinct record set.
- Multiple OPEN instances, valid DRAFT→OPEN→CLOSED transitions, no reopen, server timestamps.
- Snapshot correctness for staff in one or multiple audience departments; later roster changes do not change old eligibility.
- No ordinary user/staff report access; owner, assigned Department Manager and actively authorized Operator see the entire internal register only for the correct instance.
- Institution Admin cannot read private department-owned OPEN records; post-close share/revoke immediately changes access.
- Device binding, multiple devices per instance, explicit selection, closed-session rejection and duplicate/concurrent scan protection.
- Series matrix ordering, same-date disambiguation, per-instance eligibility, OPEN_EMPTY, CLOSED ABSENT and historical eligibility-unavailable behavior; CSV/print totals match.
- Link generation permitted only for authorized owner/manager; Series allowlist freezes at creation; Single Instance never returns siblings.
- Link retrieval without recipient login is read-only; no Firestore anonymous access or alternate endpoint expansion.
- 256-bit token, hash-only storage, token never in logs/analytics/audit; invalid, revoked, expired and tampered tokens fail.
- Exact expiry boundary, including unused link; creator disabled/authorization revoked fails; creator and Session Owner revocation succeed as specified.
- Rate limit activates; report pages are bounded; no per-view audit; metrics exclude identifiers/secrets.
- Historical records remain readable under legacy policy; no inferred absence without snapshot and no silent new access.

### 20.10 Migration, rollback and remaining prerequisite

Use additive, idempotent dry-run migration for department mappings only after review. Do not rewrite flat attendance records or infer past ownership/audience/sharing. Historical sessions without snapshots show recorded presence and unknown eligibility for missing records. Preserve QR identifiers and membership. Rollback means restore the previous Rules/application release and disable new callable paths; retain old records and token metadata until any applicable link expires or is revoked.

The sole external prerequisite currently unverified is the hosting provider/project and its /kpmbp and /r/ fallback rules. No remaining product-policy question is required to start implementation once the user explicitly approves it; hosting evidence is required before implementing/releasing direct SPA routes.
