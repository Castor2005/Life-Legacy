/**
 * Phase 0 Payload-First Security Test Specification for firestore.rules.
 * Verifies all "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 *
 * Run against the Firebase Emulator Suite with @firebase/rules-unit-testing when available.
 */
import fs from "node:fs";
import path from "node:path";

export interface DirtyDozenCase {
  id: number;
  name: string;
  path: string;
  operation: "get" | "list" | "create" | "update" | "delete";
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: "PERMISSION_DENIED";
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: "PII blanket read by non-owner",
    path: "/users/victimUid",
    operation: "get",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: true },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 2,
    name: "Users collection list enumeration",
    path: "/users",
    operation: "list",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: true },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 3,
    name: "Shadow field injection on profile create",
    path: "/users/attackerUid",
    operation: "create",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: true },
    payload: {
      uid: "attackerUid",
      displayName: "Attacker",
      email: "a@example.com",
      theme: "crimson",
      lang: "en",
      uiTab: "activities",
      uiMusic: true,
      isAdmin: true,
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 4,
    name: "Identity spoofing on profile create",
    path: "/users/attackerUid",
    operation: "create",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: true },
    payload: {
      uid: "victimUid",
      displayName: "Spoof",
      email: "a@example.com",
      theme: "crimson",
      lang: "en",
      uiTab: "activities",
      uiMusic: true,
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 5,
    name: "Unverified email write attempt",
    path: "/users/attackerUid",
    operation: "create",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: false },
    payload: {
      uid: "attackerUid",
      displayName: "Unverified",
      email: "a@example.com",
      theme: "dark",
      lang: "en",
      uiTab: "activities",
      uiMusic: true,
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 6,
    name: "Client-forged createdAt timestamp",
    path: "/users/attackerUid",
    operation: "create",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: true },
    payload: {
      uid: "attackerUid",
      displayName: "Backdated",
      email: "a@example.com",
      theme: "dark",
      lang: "en",
      uiTab: "activities",
      uiMusic: true,
      createdAt: "2020-01-01T00:00:00Z",
      updatedAt: "2020-01-01T00:00:00Z",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 7,
    name: "Value poisoning invalid theme enum",
    path: "/users/attackerUid",
    operation: "update",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: true },
    payload: {
      theme: "malicious_theme_value",
      displayName: "x".repeat(250),
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 8,
    name: "Immortal field mutation (uid / createdAt)",
    path: "/users/attackerUid",
    operation: "update",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: true },
    payload: {
      uid: "anotherUid",
      createdAt: "2022-01-01T00:00:00Z",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 9,
    name: "Path variable ID poisoning on saves",
    path: "/users/attackerUid/saves/slot99_invalid_id",
    operation: "create",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: true },
    payload: {
      ownerUid: "attackerUid",
      slotId: "slot99_invalid_id",
      savedAt: Date.now(),
      summaryName: "Test",
      summaryAge: 20,
      summaryMoney: 100,
      summaryStatus: "alive",
      state: { age: 20 },
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 10,
    name: "Orphaned subcollection write without parent user doc",
    path: "/users/orphanUid/saves/auto",
    operation: "create",
    auth: { uid: "orphanUid", email: "o@example.com", email_verified: true },
    payload: {
      ownerUid: "orphanUid",
      slotId: "auto",
      savedAt: Date.now(),
      summaryName: "Orphan",
      summaryAge: 1,
      summaryMoney: 0,
      summaryStatus: "alive",
      state: { age: 1 },
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 11,
    name: "Type poisoning: JSON string instead of native map for state",
    path: "/users/attackerUid/saves/slot0",
    operation: "create",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: true },
    payload: {
      ownerUid: "attackerUid",
      slotId: "slot0",
      savedAt: Date.now(),
      summaryName: "Poison",
      summaryAge: 20,
      summaryMoney: 100,
      summaryStatus: "alive",
      state: "{\"age\":20}",
    },
    expected: "PERMISSION_DENIED",
  },
  {
    id: 12,
    name: "Achievements ownerUid mutation or oversized unlocked map",
    path: "/users/attackerUid/meta/achievements",
    operation: "update",
    auth: { uid: "attackerUid", email: "a@example.com", email_verified: true },
    payload: {
      ownerUid: "victimUid",
      unlocked: Object.fromEntries(Array.from({ length: 80 }, (_, i) => [`a${i}`, { at: 1, life: "x" }])),
    },
    expected: "PERMISSION_DENIED",
  },
];

export function verifyRulesStructure(): { ok: boolean; errors: string[] } {
  const rulesPath = path.resolve(process.cwd(), "firestore.rules");
  const content = fs.readFileSync(rulesPath, "utf8");
  const requiredClauses = [
    "rules_version = '2';",
    "match /{document=**}",
    "allow read, write: if false;",
    "request.auth.token.email_verified == true",
    "function isValidId(",
    "function isValidUserProfile(",
    "function isValidSaveSlot(",
    "function isValidAchievementsRecord(",
    "affectedKeys().hasOnly(",
    "request.time",
    "exists(/databases/$(database)/documents/users/$(userId))",
  ];
  const errors = requiredClauses
    .filter((clause) => !content.includes(clause))
    .map((clause) => `Missing required security clause: ${clause}`);
  return { ok: errors.length === 0, errors };
}
