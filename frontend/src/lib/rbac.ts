import type { ComponentType } from "react";
import {
  LayoutDashboard, Users, UserCheck, Network, Activity, AlertOctagon, ClipboardCheck,
  ShieldCheck, Wallet, AlertTriangle, CreditCard, Package, BookOpen, MessageSquare,
  Scale, FileSearch, Database, Settings, ScrollText, HeartHandshake,
  CalendarCheck, FileText, Bell, User as UserIcon,
  Briefcase, MapPin, IndianRupee, GraduationCap, Clock, FileSignature, Inbox, Gavel,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Roles + Portals
// ---------------------------------------------------------------------------
export type Role = "super_admin" | "admin" | "support" | "consumer" | "partner";

export type Portal = "admin" | "support" | "consumer" | "partner";

export type SelfRegisterRole = Extract<Role, "consumer" | "partner">;
export const SELF_REGISTER_ROLES: { id: SelfRegisterRole; label: string; tagline: string }[] = [
  { id: "consumer", label: "Family / Patient", tagline: "Book care for a loved one" },
  { id: "partner",  label: "Care Professional", tagline: "Offer skilled care on the marketplace" },
];

export const ROLES: { id: Role; label: string; description: string }[] = [
  { id: "super_admin", label: "Super Admin",       description: "Yantram — full platform access" },
  { id: "admin",       label: "Admin",             description: "Hospital/Org — manages their nurses and operations" },
  { id: "support", label: "Support Staff", description: "Ticket resolution and escalation management" },
  { id: "consumer",    label: "Family / Patient",  description: "Self-served bookings, patients, consents" },
  { id: "partner",     label: "Care Professional", description: "Marketplace claiming + visit execution" },
];

export const ROLE_PORTAL: Record<Role, Portal> = {
  super_admin: "admin",
  admin:       "admin",
  consumer:    "consumer",
  partner:     "partner",
  support: "support",
};

export const PORTAL_LABEL: Record<Portal, string> = {
  admin:    "Admin Portal",
  consumer: "Consumer Portal",
  partner:  "Partner Portal",
  support: "/support-dashboard",
};

export const PORTAL_HOME: Record<Role, string> = {
  super_admin: "/dashboard",
  admin:       "/dashboard",
  consumer:    "/consumer",
  partner:     "/partner",
  support: "/support-dashboard",
};

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------
export type Permission =
  // Admin shared
  | "overview.view" | "ops.view" | "system.view"
  | "users.view" | "users.approve" | "onboarding.review" | "background.review"
  | "clinical.escalation" | "clinical.packages" | "clinical.rules" | "clinical.insurance"
  | "finance.reconciliation" | "finance.subscriptions" | "finance.disputes"
  | "trust.incidents" | "trust.complaints"
  | "compliance.retention" | "compliance.audit" | "compliance.settings"
  // Consumer
  | "consumer.home" | "consumer.bookings" | "consumer.patients"
  | "consumer.payments" | "consumer.consents" | "consumer.notifications" | "consumer.profile"
  // Partner
  | "partner.home" | "partner.assignments" | "partner.visits" | "partner.documentation"
  | "partner.earnings" | "partner.training" | "partner.availability"
  // After the last partner permission line, add:
| "support.queue" | "support.assign" | "support.resolve";

const SUPER_ADMIN_ALL: Permission[] = [
  "overview.view", "ops.view", "system.view",
  "users.view", "users.approve", "onboarding.review", "background.review",
  "clinical.escalation", "clinical.packages", "clinical.rules", "clinical.insurance",
  "finance.reconciliation", "finance.subscriptions", "finance.disputes",
  "trust.incidents", "trust.complaints",
  "compliance.retention", "compliance.audit", "compliance.settings",
];

// Admin (Hospital/Org) — can manage their nurses, bookings, operations
// but cannot access platform-level compliance/settings
const ADMIN_PERMISSIONS: Permission[] = [
  "overview.view", "ops.view",
  "users.view", "users.approve", "onboarding.review", "background.review",
  "clinical.escalation", "clinical.packages", "clinical.rules",
  "finance.reconciliation", "finance.disputes",
  "trust.incidents", "trust.complaints",
  "compliance.audit",
];

const CONSUMER_ALL: Permission[] = [
  "consumer.home", "consumer.bookings", "consumer.patients",
  "consumer.payments", "consumer.consents", "consumer.notifications", "consumer.profile",
];

const PARTNER_ALL: Permission[] = [
  "partner.home", "partner.assignments", "partner.visits", "partner.documentation",
  "partner.earnings", "partner.training", "partner.availability",
];
const SUPPORT_PERMISSIONS: Permission[] = [
  "support.queue",
  "support.assign",
  "support.resolve",
];
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: SUPER_ADMIN_ALL,
  admin:       ADMIN_PERMISSIONS,
  consumer:    CONSUMER_ALL,
  partner:     PARTNER_ALL,
  support: SUPPORT_PERMISSIONS,
};

// ---------------------------------------------------------------------------
// Navigation registry
// ---------------------------------------------------------------------------
export type NavSection =
  | "Overview" | "Users" | "Clinical" | "Finance" | "Trust & Safety" | "Compliance"
  | "My Care" | "Account"
  | "Work" | "Personal"
  | "Support";

export interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  section: NavSection;
  permission: Permission;
  portal: Portal;
}

export const NAV_REGISTRY: NavItem[] = [
  // ---------- ADMIN ----------
  { to: "/dashboard",               label: "Dashboard",          icon: LayoutDashboard, section: "Overview",       permission: "overview.view",             portal: "admin" },
  { to: "/ops-dashboard",           label: "Live Ops",           icon: Activity,        section: "Overview",       permission: "ops.view",                  portal: "admin" },
  { to: "/system-index",            label: "System Index",       icon: Network,         section: "Overview",       permission: "system.view",               portal: "admin" },

  { to: "/users/patients",          label: "Patients",           icon: Users,           section: "Users",          permission: "users.view",                portal: "admin" },
  { to: "/users/nurses",            label: "Nurses",             icon: HeartHandshake,  section: "Users",          permission: "users.view",                portal: "admin" },
  { to: "/nurse-approval",          label: "Nurse Approval",     icon: UserCheck,       section: "Users",          permission: "users.approve",             portal: "admin" },
  { to: "/onboarding-review",       label: "Onboarding Review",  icon: ClipboardCheck,  section: "Users",          permission: "onboarding.review",         portal: "admin" },
  { to: "/background-verification", label: "Background Check",   icon: ShieldCheck,     section: "Users",          permission: "background.review",         portal: "admin" },

  { to: "/clinical-escalation",     label: "Clinical Escalation",icon: AlertOctagon,    section: "Clinical",       permission: "clinical.escalation",       portal: "admin" },
  { to: "/care-packages",           label: "Care Packages",      icon: Package,         section: "Clinical",       permission: "clinical.packages",         portal: "admin" },
  { to: "/clinical-rule-sets",      label: "Clinical Rule Sets", icon: BookOpen,        section: "Clinical",       permission: "clinical.rules",            portal: "admin" },
  { to: "/insurance-review",        label: "Insurance Review",   icon: FileSearch,      section: "Clinical",       permission: "clinical.insurance",        portal: "admin" },

  { to: "/financial-reconciliation",label: "Financial Recon",    icon: Wallet,          section: "Finance",        permission: "finance.reconciliation",    portal: "admin" },
  { to: "/subscription-subsidy",    label: "Subscriptions",      icon: CreditCard,      section: "Finance",        permission: "finance.subscriptions",     portal: "admin" },
  { to: "/disputes",                label: "Disputes",           icon: Scale,           section: "Finance",        permission: "finance.disputes",          portal: "admin" },

  { to: "/incidents",               label: "Incidents",          icon: AlertTriangle,   section: "Trust & Safety", permission: "trust.incidents",           portal: "admin" },
  { to: "/complaints",              label: "Complaints",         icon: MessageSquare,   section: "Trust & Safety", permission: "trust.complaints",          portal: "admin" },

  { to: "/retention-dashboard",     label: "Data Retention",     icon: Database,        section: "Compliance",     permission: "compliance.retention",      portal: "admin" },
  { to: "/compliance",              label: "Compliance",         icon: ShieldCheck,     section: "Compliance",     permission: "compliance.audit",          portal: "admin" },
  { to: "/audit-logs",              label: "Audit Logs",         icon: ScrollText,      section: "Compliance",     permission: "compliance.audit",          portal: "admin" },
  { to: "/settings",                label: "Settings",           icon: Settings,        section: "Compliance",     permission: "compliance.settings",       portal: "admin" },

  // ---------- CONSUMER ----------
  { to: "/consumer",                label: "Home",               icon: LayoutDashboard, section: "My Care",        permission: "consumer.home",             portal: "consumer" },
  { to: "/consumer/bookings",       label: "Bookings",           icon: CalendarCheck,   section: "My Care",        permission: "consumer.bookings",         portal: "consumer" },
  { to: "/consumer/patients",       label: "Patients",           icon: HeartHandshake,  section: "My Care",        permission: "consumer.patients",         portal: "consumer" },
  { to: "/consumer/payments",       label: "Payments",           icon: CreditCard,      section: "Account",        permission: "consumer.payments",         portal: "consumer" },
  { to: "/consumer/consents",       label: "Consents",           icon: FileSignature,   section: "Account",        permission: "consumer.consents",         portal: "consumer" },
  { to: "/consumer/notifications",  label: "Notifications",      icon: Bell,            section: "Account",        permission: "consumer.notifications",    portal: "consumer" },
  { to: "/consumer/profile",        label: "Profile",            icon: UserIcon,        section: "Account",        permission: "consumer.profile",          portal: "consumer" },

  // ---------- PARTNER ----------
  { to: "/partner",                 label: "Workspace",          icon: LayoutDashboard, section: "Work",           permission: "partner.home",              portal: "partner" },
  { to: "/partner/assignments",     label: "Assignments",        icon: Briefcase,       section: "Work",           permission: "partner.assignments",       portal: "partner" },
  { to: "/partner/visits",          label: "Visits",             icon: MapPin,          section: "Work",           permission: "partner.visits",            portal: "partner" },
  { to: "/partner/documentation",   label: "Documentation",      icon: FileText,        section: "Work",           permission: "partner.documentation",     portal: "partner" },
  { to: "/partner/earnings",        label: "Earnings",           icon: IndianRupee,     section: "Personal",       permission: "partner.earnings",          portal: "partner" },
  { to: "/partner/training",        label: "Training",           icon: GraduationCap,   section: "Personal",       permission: "partner.training",          portal: "partner" },
  { to: "/partner/availability",    label: "Availability",       icon: Clock,           section: "Personal",       permission: "partner.availability",      portal: "partner" },
  // ---------- SUPPORT ----------
{ to: "/support-dashboard",   label: "Support Queue",    icon: Inbox,        section: "Support", permission: "support.queue",   portal: "support" },
{ to: "/support-escalations", label: "All Escalations",  icon: AlertOctagon, section: "Support", permission: "support.queue",   portal: "support" },
];

export const NAV_SECTIONS: NavSection[] = [
  "Overview", "Users", "Clinical", "Finance", "Trust & Safety", "Compliance",
  "My Care", "Account",
  "Work", "Personal",
  "Support",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function hasPermission(role: Role | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function portalForRole(role: Role | null): Portal | null {
  return role ? ROLE_PORTAL[role] : null;
}

export function portalHome(role: Role | null): string {
  return role ? PORTAL_HOME[role] : "/auth/login";
}

function matchNav(pathname: string): NavItem | undefined {
  return NAV_REGISTRY
    .filter(n => pathname === n.to || pathname.startsWith(n.to + "/"))
    .sort((a, b) => b.to.length - a.to.length)[0];
}

export function routePortal(pathname: string): Portal | null {
  return matchNav(pathname)?.portal ?? null;
}

export function canAccessRoute(role: Role | null, pathname: string): boolean {
  if (!role) return false;
  const match = matchNav(pathname);
  if (!match) return true;
  if (match.portal !== ROLE_PORTAL[role]) return false;
  return hasPermission(role, match.permission);
}

export function navForRole(role: Role | null): NavItem[] {
  if (!role) return [];
  const portal = ROLE_PORTAL[role];
  return NAV_REGISTRY.filter(n => n.portal === portal && hasPermission(role, n.permission));
}

export function routeMeta(pathname: string): { title: string; section?: NavSection; portal?: Portal } {
  const match = matchNav(pathname);
  if (!match) return { title: "NurseConnect" };
  return { title: match.label, section: match.section, portal: match.portal };
}

export function roleLabel(role: Role | null): string {
  return ROLES.find(r => r.id === role)?.label ?? "Guest";
}

// old
// import type { ComponentType } from "react";
// import {
//   LayoutDashboard, Users, UserCheck, Network, Activity, AlertOctagon, ClipboardCheck,
//   ShieldCheck, Wallet, AlertTriangle, CreditCard, Package, BookOpen, MessageSquare,
//   Scale, FileSearch, Database, Settings, ScrollText, HeartHandshake,
//   CalendarCheck, ClipboardList, GraduationCap, Clock, FileText, Bell, User as UserIcon,
//   Briefcase, MapPin, IndianRupee, FileSignature, Inbox, Gavel,
// } from "lucide-react";

// /**
//  * Centralized RBAC + Portal registry for the NurseConnect web portal.
//  *
//  * Phase 2 introduces a `Portal` concept on top of Phase 1 roles so the
//  * single integrated shell can host three isolated domains (admin /
//  * consumer / worker) without leaking nav, routes or actions across them.
//  *
//  * Rules for callers:
//  * - Pages MUST NOT hardcode role or portal literals; use `useAuth`,
//  *   `usePermission`, `useAction`, `<PermissionGate>` / `<ActionGate>` or
//  *   rely on the route + portal guard in `AppShell`.
//  * - Navigation comes from `NAV_REGISTRY` only.
//  */

// // ---------------------------------------------------------------------------
// // Roles + Portals
// // ---------------------------------------------------------------------------
// export type Role =
//   | "admin_super"
//   | "admin_ops"
//   | "admin_clinical"
//   | "admin_finance"
//   | "consumer"
//   | "worker"
//   | "reviewer"
//   | "trainer";

// export type Portal = "admin" | "consumer" | "worker" | "moderation";

// /** Marketplace registration tracks — what a self-registering user can choose.
//  *  Admin/clinical/finance/reviewer/trainer roles are provisioned, not self-served. */
// export type SelfRegisterRole = Extract<Role, "consumer" | "worker">;
// export const SELF_REGISTER_ROLES: { id: SelfRegisterRole; label: string; tagline: string }[] = [
//   { id: "consumer", label: "Family / Patient", tagline: "Book care for a loved one" },
//   { id: "worker", label: "Care Professional", tagline: "Offer skilled care on the marketplace" },
// ];

// export const ROLES: { id: Role; label: string; description: string }[] = [
//   { id: "admin_super", label: "Super Admin", description: "Full access across all modules" },
//   { id: "admin_ops", label: "Operations Admin", description: "Queue supervision, escalations, interventions" },
//   { id: "admin_clinical", label: "Clinical Admin", description: "Clinical escalations, rule sets, insurance" },
//   { id: "admin_finance", label: "Finance Admin", description: "Reconciliation, subscriptions, disputes" },
//   { id: "consumer", label: "Family / Patient", description: "Self-served bookings, patients, consents" },
//   { id: "worker", label: "Care Professional", description: "Marketplace claiming + visit execution" },
//   { id: "reviewer", label: "Reviewer", description: "Moderates onboarding + operational submissions" },
//   { id: "trainer", label: "Trainer", description: "Reviews competency + training submissions" },
// ];

// export const ROLE_PORTAL: Record<Role, Portal> = {
//   admin_super: "admin",
//   admin_ops: "admin",
//   admin_clinical: "admin",
//   admin_finance: "admin",
//   consumer: "consumer",
//   worker: "worker",
//   reviewer: "moderation",
//   trainer: "moderation",
// };

// export const PORTAL_LABEL: Record<Portal, string> = {
//   admin: "Admin Portal",
//   consumer: "Consumer Portal",
//   worker: "Worker Portal",
//   moderation: "Moderation Portal",
// };

// // Per-role landing routes. Phase 2 replaces the generic /dashboard assumption.
// export const PORTAL_HOME: Record<Role, string> = {
//   admin_super: "/dashboard",
//   admin_ops: "/ops-dashboard",
//   admin_clinical: "/clinical-escalation",
//   admin_finance: "/financial-reconciliation",
//   consumer: "/consumer",
//   worker: "/worker",
//   reviewer: "/moderation",
//   trainer: "/moderation/training",
// };

// // ---------------------------------------------------------------------------
// // Permissions (route-level capability access — Phase 1)
// // ---------------------------------------------------------------------------
// export type Permission =
//   | "overview.view" | "ops.view" | "system.view"
//   | "users.view" | "users.approve" | "onboarding.review" | "background.review"
//   | "clinical.escalation" | "clinical.packages" | "clinical.rules" | "clinical.insurance"
//   | "finance.reconciliation" | "finance.subscriptions" | "finance.disputes"
//   | "trust.incidents" | "trust.complaints"
//   | "compliance.retention" | "compliance.audit" | "compliance.settings"
//   // Consumer
//   | "consumer.home" | "consumer.bookings" | "consumer.patients"
//   | "consumer.payments" | "consumer.consents" | "consumer.notifications" | "consumer.profile"
//   // Worker
//   | "worker.home" | "worker.assignments" | "worker.visits" | "worker.documentation"
//   | "worker.earnings" | "worker.training" | "worker.availability"
//   // Moderation
//   | "moderation.queue" | "moderation.training";

// const ADMIN_ALL: Permission[] = [
//   "overview.view", "ops.view", "system.view",
//   "users.view", "users.approve", "onboarding.review", "background.review",
//   "clinical.escalation", "clinical.packages", "clinical.rules", "clinical.insurance",
//   "finance.reconciliation", "finance.subscriptions", "finance.disputes",
//   "trust.incidents", "trust.complaints",
//   "compliance.retention", "compliance.audit", "compliance.settings",
// ];

// const CONSUMER_ALL: Permission[] = [
//   "consumer.home", "consumer.bookings", "consumer.patients",
//   "consumer.payments", "consumer.consents", "consumer.notifications", "consumer.profile",
// ];

// const WORKER_ALL: Permission[] = [
//   "worker.home", "worker.assignments", "worker.visits", "worker.documentation",
//   "worker.earnings", "worker.training", "worker.availability",
// ];

// export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
//   admin_super: ADMIN_ALL,
//   admin_ops: [
//     "overview.view", "ops.view", "system.view",
//     "users.view", "users.approve", "onboarding.review", "background.review",
//     "trust.incidents", "trust.complaints",
//     "compliance.audit",
//   ],
//   admin_clinical: [
//     "overview.view", "ops.view",
//     "users.view",
//     "clinical.escalation", "clinical.packages", "clinical.rules", "clinical.insurance",
//     "trust.incidents",
//     "compliance.audit",
//   ],
//   admin_finance: [
//     "overview.view",
//     "finance.reconciliation", "finance.subscriptions", "finance.disputes",
//     "compliance.audit",
//   ],
//   consumer: CONSUMER_ALL,
//   worker: WORKER_ALL,
//   reviewer: ["moderation.queue"],
//   trainer: ["moderation.queue", "moderation.training"],
// };

// // ---------------------------------------------------------------------------
// // Navigation registry — drives sidebar AND breadcrumbs AND route guard.
// // Every entry carries a Portal so menus and routes stay portal-isolated.
// // ---------------------------------------------------------------------------
// export type NavSection =
//   // Admin
//   | "Overview" | "Users" | "Clinical" | "Finance" | "Trust & Safety" | "Compliance"
//   // Consumer
//   | "My Care" | "Account"
//   // Worker
//   | "Work" | "Personal"
//   // Moderation
//   | "Review";

// export interface NavItem {
//   to: string;
//   label: string;
//   icon: ComponentType<{ className?: string }>;
//   section: NavSection;
//   permission: Permission;
//   portal: Portal;
// }

// export const NAV_REGISTRY: NavItem[] = [
//   // ---------- ADMIN ----------
//   { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Overview", permission: "overview.view", portal: "admin" },
//   { to: "/ops-dashboard", label: "Live Ops", icon: Activity, section: "Overview", permission: "ops.view", portal: "admin" },
//   { to: "/system-index", label: "System Index", icon: Network, section: "Overview", permission: "system.view", portal: "admin" },

//   { to: "/users/patients", label: "Patients", icon: Users, section: "Users", permission: "users.view", portal: "admin" },
//   { to: "/users/nurses", label: "Nurses", icon: HeartHandshake, section: "Users", permission: "users.view", portal: "admin" },
//   { to: "/nurse-approval", label: "Nurse Approval", icon: UserCheck, section: "Users", permission: "users.approve", portal: "admin" },
//   { to: "/onboarding-review", label: "Onboarding Review", icon: ClipboardCheck, section: "Users", permission: "onboarding.review", portal: "admin" },
//   { to: "/background-verification", label: "Background Check", icon: ShieldCheck, section: "Users", permission: "background.review", portal: "admin" },

//   { to: "/clinical-escalation", label: "Clinical Escalation", icon: AlertOctagon, section: "Clinical", permission: "clinical.escalation", portal: "admin" },
//   { to: "/care-packages", label: "Care Packages", icon: Package, section: "Clinical", permission: "clinical.packages", portal: "admin" },
//   { to: "/clinical-rule-sets", label: "Clinical Rule Sets", icon: BookOpen, section: "Clinical", permission: "clinical.rules", portal: "admin" },
//   { to: "/insurance-review", label: "Insurance Review", icon: FileSearch, section: "Clinical", permission: "clinical.insurance", portal: "admin" },

//   { to: "/financial-reconciliation", label: "Financial Recon", icon: Wallet, section: "Finance", permission: "finance.reconciliation", portal: "admin" },
//   { to: "/subscription-subsidy", label: "Subscriptions & Subsidy", icon: CreditCard, section: "Finance", permission: "finance.subscriptions", portal: "admin" },
//   { to: "/disputes", label: "Disputes", icon: Scale, section: "Finance", permission: "finance.disputes", portal: "admin" },

//   { to: "/incidents", label: "Incidents", icon: AlertTriangle, section: "Trust & Safety", permission: "trust.incidents", portal: "admin" },
//   { to: "/complaints", label: "Complaints", icon: MessageSquare, section: "Trust & Safety", permission: "trust.complaints", portal: "admin" },

//   { to: "/retention-dashboard", label: "Data Retention", icon: Database, section: "Compliance", permission: "compliance.retention", portal: "admin" },
//   { to: "/compliance", label: "Compliance", icon: ShieldCheck, section: "Compliance", permission: "compliance.audit", portal: "admin" },
//   { to: "/audit-logs", label: "Audit Logs", icon: ScrollText, section: "Compliance", permission: "compliance.audit", portal: "admin" },
//   { to: "/settings", label: "Settings", icon: Settings, section: "Compliance", permission: "compliance.settings", portal: "admin" },
  
//   // ---------- CONSUMER ----------
//   { to: "/consumer", label: "Home", icon: LayoutDashboard, section: "My Care", permission: "consumer.home", portal: "consumer" },
//   { to: "/consumer/bookings", label: "Bookings", icon: CalendarCheck, section: "My Care", permission: "consumer.bookings", portal: "consumer" },
//   { to: "/consumer/patients", label: "Patients", icon: HeartHandshake, section: "My Care", permission: "consumer.patients", portal: "consumer" },
//   { to: "/consumer/payments", label: "Payments", icon: CreditCard, section: "Account", permission: "consumer.payments", portal: "consumer" },
//   { to: "/consumer/consents", label: "Consents", icon: FileSignature, section: "Account", permission: "consumer.consents", portal: "consumer" },
//   { to: "/consumer/notifications", label: "Notifications", icon: Bell, section: "Account", permission: "consumer.notifications", portal: "consumer" },
//   { to: "/consumer/profile", label: "Profile", icon: UserIcon, section: "Account", permission: "consumer.profile", portal: "consumer" },

//   // ---------- WORKER ----------
//   { to: "/worker", label: "Workspace", icon: LayoutDashboard, section: "Work", permission: "worker.home", portal: "worker" },
//   { to: "/worker/assignments", label: "Assignments", icon: Briefcase, section: "Work", permission: "worker.assignments", portal: "worker" },
//   { to: "/worker/visits", label: "Visits", icon: MapPin, section: "Work", permission: "worker.visits", portal: "worker" },
//   { to: "/worker/documentation", label: "Documentation", icon: FileText, section: "Work", permission: "worker.documentation", portal: "worker" },
//   { to: "/worker/earnings", label: "Earnings", icon: IndianRupee, section: "Personal", permission: "worker.earnings", portal: "worker" },
//   { to: "/worker/training", label: "Training", icon: GraduationCap, section: "Personal", permission: "worker.training", portal: "worker" },
//   { to: "/worker/availability", label: "Availability", icon: Clock, section: "Personal", permission: "worker.availability", portal: "worker" },

//   // ---------- MODERATION ----------
//   { to: "/moderation", label: "Review Queue", icon: Inbox, section: "Review", permission: "moderation.queue", portal: "moderation" },
//   { to: "/moderation/training", label: "Training Reviews", icon: Gavel, section: "Review", permission: "moderation.training", portal: "moderation" },
// ];

// export const NAV_SECTIONS: NavSection[] = [
//   "Overview", "Users", "Clinical", "Finance", "Trust & Safety", "Compliance",
//   "My Care", "Account",
//   "Work", "Personal",
//   "Review",
// ];

// // ---------------------------------------------------------------------------
// // Helpers
// // ---------------------------------------------------------------------------
// export function hasPermission(role: Role | null, permission: Permission): boolean {
//   if (!role) return false;
//   return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
// }

// export function portalForRole(role: Role | null): Portal | null {
//   return role ? ROLE_PORTAL[role] : null;
// }

// export function portalHome(role: Role | null): string {
//   return role ? PORTAL_HOME[role] : "/auth/login";
// }

// function matchNav(pathname: string): NavItem | undefined {
//   return NAV_REGISTRY
//     .filter(n => pathname === n.to || pathname.startsWith(n.to + "/"))
//     .sort((a, b) => b.to.length - a.to.length)[0];
// }

// export function routePortal(pathname: string): Portal | null {
//   return matchNav(pathname)?.portal ?? null;
// }

// export function canAccessRoute(role: Role | null, pathname: string): boolean {
//   if (!role) return false;
//   const match = matchNav(pathname);
//   if (!match) return true; // unregistered (login screens etc.)
//   if (match.portal !== ROLE_PORTAL[role]) return false;
//   return hasPermission(role, match.permission);
// }

// export function navForRole(role: Role | null): NavItem[] {
//   if (!role) return [];
//   const portal = ROLE_PORTAL[role];
//   return NAV_REGISTRY.filter(n => n.portal === portal && hasPermission(role, n.permission));
// }

// export function routeMeta(pathname: string): { title: string; section?: NavSection; portal?: Portal } {
//   const match = matchNav(pathname);
//   if (!match) return { title: "NurseConnect" };
//   return { title: match.label, section: match.section, portal: match.portal };
// }

// export function roleLabel(role: Role | null): string {
//   return ROLES.find(r => r.id === role)?.label ?? "Guest";
// }
