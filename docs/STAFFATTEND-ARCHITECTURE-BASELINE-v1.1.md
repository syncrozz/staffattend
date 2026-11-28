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
