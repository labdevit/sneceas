/**
 * ─── ACL — Access Control List centralisé ─────────────────────────────
 *
 * Rôles backend (table UserRole) :
 *
 * | Code           | Nom                      |
 * |----------------|--------------------------|
 * | super_admin    | Super Administrateur     |
 * | syndic_admin   | Administrateur Syndical  |
 * | pole_manager   | Responsable de Pôle      |
 * | pole_member    | Membre de Pôle           |
 * | delegate       | Délégué Syndical         |
 * | hr_liaison     | Agent Liaison RH         |
 * | secretary      | Secrétaire               |
 * | auditor        | Auditeur                 |
 */

// ── Role codes ───────────────────────────────────────────────────────
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  SYNDIC_ADMIN: "syndic_admin",
  POLE_MANAGER: "pole_manager",
  POLE_MEMBER: "pole_member",
  DELEGATE: "delegate",
  HR_LIAISON: "hr_liaison",
  SECRETARY: "secretary",
  AUDITOR: "auditor",
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES] | string;

/** Tous les rôles (pour « accès universel ») */
const ALL_ROLES: RoleCode[] = Object.values(ROLES);

/** Rôles de gestion (administration, rapports, classification) */
const MANAGEMENT_ROLES: RoleCode[] = [
  ROLES.SUPER_ADMIN,
  ROLES.SYNDIC_ADMIN,
  ROLES.POLE_MANAGER,
];

/** Rôles administratifs (CRUD complet back-office) */
const ADMIN_ROLES: RoleCode[] = [
  ROLES.SUPER_ADMIN,
  ROLES.SYNDIC_ADMIN,
];

// ── Permissions par feature / page ───────────────────────────────────
export type Feature =
  | "dashboard"
  | "submit_request"
  | "tickets"
  | "ticket_detail"
  | "ticket_classify"
  | "calendar"
  | "poles"
  | "delegates"
  | "documents"
  | "communication"
  | "reports"
  | "admin";

/**
 * Matrice ACL : pour chaque feature, liste des role_codes autorisés.
 *
 * ┌──────────────────┬─────────┬────────┬────────┬────────┬────────┬────────┬────────┬────────┐
 * │ Feature          │ s_admin │ sy_adm │ p_mgr  │ p_mem  │ deleg  │ hr_lia │ secr   │ audit  │
 * ├──────────────────┼─────────┼────────┼────────┼────────┼────────┼────────┼────────┼────────┤
 * │ dashboard        │ ✅      │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │
 * │ submit_request   │ ✅      │ ✅     │ ✅     │ ✅     │ ✅     │ ❌     │ ✅     │ ❌     │
 * │ tickets          │ ✅      │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │
 * │ ticket_detail    │ ✅      │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │
 * │ ticket_classify  │ ✅      │ ✅     │ ✅     │ ❌     │ ✅     │ ❌     │ ❌     │ ❌     │
 * │ calendar         │ ✅      │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ❌     │
 * │ poles            │ ✅      │ ✅     │ ✅     │ ✅     │ ❌     │ ❌     │ ❌     │ ✅     │
 * │ delegates        │ ✅      │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │
 * │ documents        │ ✅      │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │
 * │ communication    │ ✅      │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │ ✅     │
 * │ reports          │ ✅      │ ✅     │ ✅     │ ❌     │ ❌     │ ❌     │ ❌     │ ✅     │
 * │ admin            │ ✅      │ ✅     │ ❌     │ ❌     │ ❌     │ ❌     │ ❌     │ ❌     │
 * └──────────────────┴─────────┴────────┴────────┴────────┴────────┴────────┴────────┴────────┘
 */
export const PERMISSIONS: Record<Feature, RoleCode[]> = {
  dashboard: ALL_ROLES,

  submit_request: [
    ROLES.SUPER_ADMIN,
    ROLES.SYNDIC_ADMIN,
    ROLES.POLE_MANAGER,
    ROLES.POLE_MEMBER,
    ROLES.DELEGATE,
    ROLES.SECRETARY,
  ],

  tickets: ALL_ROLES,

  ticket_detail: ALL_ROLES,

  ticket_classify: [
    ROLES.SUPER_ADMIN,
    ROLES.SYNDIC_ADMIN,
    ROLES.POLE_MANAGER,
    ROLES.DELEGATE,
  ],

  calendar: [
    ROLES.SUPER_ADMIN,
    ROLES.SYNDIC_ADMIN,
    ROLES.POLE_MANAGER,
    ROLES.POLE_MEMBER,
    ROLES.DELEGATE,
    ROLES.HR_LIAISON,
    ROLES.SECRETARY,
  ],

  poles: [
    ROLES.SUPER_ADMIN,
    ROLES.SYNDIC_ADMIN,
    ROLES.POLE_MANAGER,
    ROLES.POLE_MEMBER,
    ROLES.AUDITOR,
  ],

  delegates: ALL_ROLES,

  documents: ALL_ROLES,

  communication: ALL_ROLES,

  reports: [
    ...MANAGEMENT_ROLES,
    ROLES.AUDITOR,
  ],

  admin: ADMIN_ROLES,
};

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Vérifie si un utilisateur (via ses role_codes) peut accéder à une feature.
 * Un is_superuser a toujours accès.
 */
export function canAccess(
  feature: Feature,
  userRoleCodes: string[],
  isSuperuser = false
): boolean {
  if (isSuperuser) return true;
  const allowed = PERMISSIONS[feature];
  return userRoleCodes.some((code) => allowed.includes(code));
}

/**
 * Retourne les features accessibles pour un jeu de role_codes donné.
 */
export function accessibleFeatures(
  userRoleCodes: string[],
  isSuperuser = false
): Feature[] {
  if (isSuperuser) return Object.keys(PERMISSIONS) as Feature[];
  return (Object.entries(PERMISSIONS) as [Feature, RoleCode[]][])
    .filter(([, allowed]) => userRoleCodes.some((code) => allowed.includes(code)))
    .map(([feature]) => feature);
}

// ── Route → Feature mapping (pour ProtectedRoute) ───────────────────
export const ROUTE_PERMISSIONS: Record<string, Feature> = {
  "/": "dashboard",
  "/submit": "submit_request",
  "/tickets": "tickets",
  "/tickets/:id": "ticket_detail",
  "/calendar": "calendar",
  "/poles": "poles",
  "/delegates": "delegates",
  "/documents": "documents",
  "/communication": "communication",
  "/reports": "reports",
  "/admin": "admin",
};

// ── Sidebar navigation mapping ──────────────────────────────────────
export const SIDEBAR_FEATURES: Record<string, Feature> = {
  "/": "dashboard",
  "/submit": "submit_request",
  "/tickets": "tickets",
  "/calendar": "calendar",
  "/poles": "poles",
  "/documents": "documents",
  "/delegates": "delegates",
  "/communication": "communication",
  "/reports": "reports",
  "/admin": "admin",
};

// ── Labels pour affichage ────────────────────────────────────────────
export const ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: "Super Administrateur",
  [ROLES.SYNDIC_ADMIN]: "Administrateur Syndical",
  [ROLES.POLE_MANAGER]: "Responsable de Pôle",
  [ROLES.POLE_MEMBER]: "Membre de Pôle",
  [ROLES.DELEGATE]: "Délégué Syndical",
  [ROLES.HR_LIAISON]: "Agent Liaison RH",
  [ROLES.SECRETARY]: "Secrétaire",
  [ROLES.AUDITOR]: "Auditeur",
};
