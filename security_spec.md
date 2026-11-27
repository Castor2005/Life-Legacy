# Life & Legacy — Firestore Security Specification (Phase 0)

## 1. Data Invariants

1. **Zero Public PII**: `/users/{userId}` contains `email` and `photoURL`. Only the verified owner (`request.auth.uid == userId && request.auth.token.email_verified == true`) may `get`, `create`, or `update` their own profile. Blanket `list` on `/users` is denied.
2. **Master Gate on Subcollections**: Every document under `/users/{userId}/saves/{slotId}` and `/users/{userId}/meta/{metaId}` requires the parent `/users/{userId}` profile document to exist (`exists(...)`), and `ownerUid == request.auth.uid == userId`.
3. **Fixed Slot & Meta IDs**: `slotId` must match `^(auto|slot[0-6])$` and equal `incoming().slotId`. `metaId` must equal `'achievements'`.
4. **No Shadow Fields**: Every `create` validates exact `keys().hasAll(...) && keys().hasOnly(...)`; every `update` validates `isValid[Entity](incoming())` plus action-scoped `affectedKeys().hasOnly(...)`.
5. **Immutable Identity & Timestamps**: `uid`, `ownerUid`, `slotId`, and `createdAt` can never change on update. `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
6. **Verified Google Auth Only**: Every read/write requires `request.auth != null && request.auth.token.email_verified == true`.
7. **No List Enumeration**: None of `/users`, `/saves`, or `/meta` allow `list` queries because clients address deterministic document IDs (`userId`, `auto`, `slot0`..`slot6`, `achievements`).

## 2. The "Dirty Dozen" Adversarial Payloads

| # | Target Path | Attack Category | Payload / Operation | Expected Result |
|---|-------------|-----------------|---------------------|-----------------|
| 1 | `/users/victimUid` | PII Blanket Read | Authenticated non-owner `get()` on another user's profile | `PERMISSION_DENIED` |
| 2 | `/users` | Collection Enumeration | Authenticated user `list()` on `/users` | `PERMISSION_DENIED` |
| 3 | `/users/attackerUid` | Shadow Field Injection | `create` with valid fields + ghost field `{ isAdmin: true }` | `PERMISSION_DENIED` |
| 4 | `/users/attackerUid` | Identity Spoofing | `create` where `uid: "victimUid"` differs from `request.auth.uid` | `PERMISSION_DENIED` |
| 5 | `/users/attackerUid` | Unverified Email Spoof | `create` or `update` when `request.auth.token.email_verified == false` | `PERMISSION_DENIED` |
| 6 | `/users/attackerUid` | Client Timestamp Forgery | `create` with client-supplied `createdAt` not equal to `request.time` | `PERMISSION_DENIED` |
| 7 | `/users/attackerUid` | Value Poisoning | `update` setting `theme: "invalid_theme"` or `displayName` > 100 chars | `PERMISSION_DENIED` |
| 8 | `/users/attackerUid` | Immortal Field Mutation | `update` attempting to mutate `createdAt` or `uid` | `PERMISSION_DENIED` |
| 9 | `/users/attackerUid/saves/slot99` | Path Variable ID Poisoning | `create` with invalid `slotId` outside `auto|slot0..slot6` or 1.5KB ID | `PERMISSION_DENIED` |
| 10 | `/users/orphanUid/saves/auto` | Orphaned Subcollection Write | `create` save slot when parent `/users/orphanUid` does not exist | `PERMISSION_DENIED` |
| 11 | `/users/attackerUid/saves/slot0` | JSON String / Type Poisoning | `create` with `state: "{\"money\":999}"` (string instead of map) | `PERMISSION_DENIED` |
| 12 | `/users/attackerUid/meta/achievements` | Oversized / Malicious Map Key | `update` with `unlocked` map > 64 entries or mutating `ownerUid` | `PERMISSION_DENIED` |
