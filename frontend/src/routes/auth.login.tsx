import { createFileRoute, Navigate, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Clock, HeartHandshake, ArrowRight } from "lucide-react";
import logo from "@/assets/yantram-logo.jpg";
import { useAuth } from "@/lib/auth-context";
import { ROLES, portalHome, portalForRole, routePortal, type Role } from "@/lib/rbac";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Login — NurseConnect" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
});

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function safeRedirect(role: Role, raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    let decoded = raw;
    for (let i = 0; i < 5 && /%[0-9A-Fa-f]{2}/.test(decoded); i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
    const path = decoded.split("?")[0];
    if (path.startsWith("/auth")) return null;
    const target = routePortal(path);
    if (target && target !== portalForRole(role)) return null;
    return decoded;
  } catch {
    return null;
  }
}

type Persona = "consumer" | "partner" | "admin";

const PERSONA_LABEL: Record<Persona, string> = {
  consumer: "Consumer / Family",
  partner:  "Partner / Professional",
  admin:    "Admin",
};

const PERSONA_DEFAULT: Record<Persona, Role> = {
  consumer: "consumer",
  partner:  "partner",
  admin:    "super_admin",
};

const PERSONA_SUBROLES: Record<Persona, Role[]> = {
  consumer: ["consumer"],
  partner:  ["partner"],
  admin:    ["super_admin", "admin"],
};

// Map frontend role → backend role string
const ROLE_TO_BACKEND: Record<string, string> = {
  consumer:   "consumer",
  partner:    "worker",
  admin:      "admin_ops",
  super_admin: "admin_super",
};

// Map backend role → frontend role
const BACKEND_TO_ROLE: Record<string, Role> = {
  consumer:      "consumer",
  worker:        "partner",
  admin_ops:     "admin",
  admin_super:   "super_admin",
  admin_finance: "admin",
  admin_clinical: "admin",
};

// Demo phone numbers per persona
const DEMO_PHONES: Record<string, string> = {
  consumer:   "+919999000001",
  partner:    "+919999000002",
  super_admin: "+919999000004",
  admin:      "+919999000003",
};

async function apiLogin(phone_e164: string, backendRole: string) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone_e164, role: backendRole, code: "123456" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.detail?.[0]?.msg ?? err?.detail ?? `Login failed (${res.status})`
    );
  }
  return res.json();
}

function saveTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

function LoginPage() {
  const nav = useNavigate();
  const { signIn, isAuthenticated, user, hydrated } = useAuth();
  const { redirect } = useSearch({ from: "/auth/login" });

  const [phone, setPhone] = useState("+91 99990 00001");
  const [persona, setPersona] = useState<Persona>("consumer");
  const [role, setRole] = useState<Role>(PERSONA_DEFAULT.consumer);
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const choosePersona = (p: Persona) => {
    setPersona(p);
    setRole(PERSONA_DEFAULT[p]);
    // Set demo phone for that persona
    setPhone(DEMO_PHONES[PERSONA_DEFAULT[p]] ?? "+919999000001");
  };

  if (hydrated && isAuthenticated && user) {
    const target = safeRedirect(user.role, redirect) ?? portalHome(user.role);
    return <Navigate to={target as string} />;
  }

  const doLogin = async (phone_e164: string, frontendRole: Role, displayName?: string) => {
    const backendRole = ROLE_TO_BACKEND[frontendRole] ?? "consumer";
    const data = await apiLogin(phone_e164, backendRole);
    saveTokens(data.tokens.access_token, data.tokens.refresh_token);
    const mappedRole = BACKEND_TO_ROLE[data.user.role] ?? "consumer";
    signIn({
      id: data.user.id,
      name: data.user.full_name ?? displayName ?? "User",
      email: data.user.email ?? `user@nurseconnect.in`,
      role: mappedRole,
    });
    return mappedRole;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Normalize phone to E.164
      const raw = phone.replace(/\s+/g, "").replace(/-/g, "");
      const phone_e164 = raw.startsWith("+") ? raw : `+91${raw.replace(/^0/, "")}`;

      const safeRole: Role =
        mode === "register" && role !== "consumer" && role !== "partner"
          ? persona === "partner" ? "partner" : "consumer"
          : role;

      const mappedRole = await doLogin(phone_e164, safeRole);
      const target = safeRedirect(mappedRole, redirect) ?? portalHome(mappedRole);
      setTimeout(() => nav({ to: target as string }), 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (frontendRole: Role, displayName: string, to: string) => {
    setError(null);
    setLoading(true);
    try {
      const phone_e164 = DEMO_PHONES[frontendRole] ?? "+919999000001";
      await doLogin(phone_e164, frontendRole, displayName);
      setTimeout(() => nav({ to }), 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex w-1/2 nc-sidebar-bg text-sidebar-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute top-32 -left-16 h-72 w-72 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Yantram" className="h-12 w-12 rounded-lg bg-white/95 p-1" />
            <div>
              <div className="text-xl font-semibold">NurseConnect</div>
              <div className="text-xs text-sidebar-muted">by Yantram Healthcare</div>
            </div>
          </div>
          <h1 className="mt-16 text-4xl font-semibold leading-tight">
            Professional Healthcare<br />At Your Doorstep
          </h1>
          <p className="mt-4 text-sidebar-muted max-w-md">
            Connect with verified nurses for home healthcare services. Quality care, anytime, anywhere.
          </p>
          <ul className="mt-10 space-y-4 max-w-md">
            {[
              { icon: ShieldCheck, t: "Verified & Certified Nurses", d: "Background-checked, license-verified caregivers." },
              { icon: Clock, t: "24/7 Availability", d: "Care coordination round the clock across India." },
              { icon: HeartHandshake, t: "Subsidy Support for BPL Families", d: "Government-aligned schemes built in." },
            ].map((f) => (
              <li key={f.t} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-md bg-white/10 grid place-items-center"><f.icon className="h-4 w-4" /></div>
                <div>
                  <div className="text-sm font-medium">{f.t}</div>
                  <div className="text-xs text-sidebar-muted">{f.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-sidebar-muted">© 2026 Yantram Healthcare. All rights reserved.</div>
      </div>

      {/* Form panel */}
      <div className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src={logo} alt="Yantram" className="h-10 w-10 rounded-lg" />
            <div className="text-lg font-semibold">NurseConnect</div>
          </div>
          <div className="nc-card p-8">
            <div className="flex items-center gap-1 p-1 rounded-md bg-secondary/60 mb-4 text-[12px] font-medium">
              {(["signin","register"] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 px-3 py-1.5 rounded-md transition ${mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                  {m === "signin" ? "Sign in" : "Register"}
                </button>
              ))}
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {mode === "signin" ? "Welcome Back" : "Join the marketplace"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin"
                ? "Login to continue to your portal"
                : "Self-register as a family or care professional"}
            </p>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              {mode === "register" && (
                <div>
                  <label className="text-[12px] font-medium text-foreground">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Asha Mehra"
                    className="mt-1.5 w-full px-3 py-2.5 text-[14px] rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
              )}
              <div>
                <label className="text-[12px] font-medium text-foreground">Mobile Number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 text-[14px] rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>
              <div>
                <label className="text-[12px] font-medium text-foreground">
                  {mode === "signin" ? "Sign in as" : "I am a"}
                </label>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5 p-1 rounded-md bg-secondary/60 text-[12px] font-medium">
                  {(["consumer","partner","admin"] as Persona[]).map(p => (
                    <button key={p} type="button"
                      onClick={() => choosePersona(p)}
                      className={`px-2 py-1.5 rounded-md transition ${persona === p ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}>
                      {PERSONA_LABEL[p]}
                    </button>
                  ))}
                </div>
                {mode === "signin" && PERSONA_SUBROLES[persona].length > 1 && (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="mt-2 w-full px-3 py-2.5 text-[13px] rounded-md border border-border bg-card focus:outline-none focus:ring-2 focus:ring-ring/40"
                  >
                    {PERSONA_SUBROLES[persona].map(rid => {
                      const meta = ROLES.find(r => r.id === rid);
                      return <option key={rid} value={rid}>{meta?.label ?? rid} — {meta?.description ?? ""}</option>;
                    })}
                  </select>
                )}
                {mode === "register" && persona !== "consumer" && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Partner accounts register as care professionals. Admin variants are provisioned by operations.
                  </p>
                )}
              </div>

              {error && (
                <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md font-medium hover:opacity-95 disabled:opacity-60 transition"
              >
                {loading ? "Logging in…" : mode === "signin" ? "Login" : "Create account"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 text-[13px] text-muted-foreground text-center">
              {mode === "signin"
                ? <>Don't have an account? <button type="button" onClick={() => setMode("register")} className="text-primary font-medium">Register</button></>
                : <>Already registered? <button type="button" onClick={() => setMode("signin")} className="text-primary font-medium">Sign in</button></>}
            </div>

            {/* Quick-access demo shortcuts */}
            <div className="mt-6 grid grid-cols-3 gap-2 pt-4 border-t border-border">
              {([
                { label: "Family →",  role: "consumer"    as Role, name: "Aanya Sharma",      to: "/consumer"  },
                { label: "Partner →", role: "partner"     as Role, name: "Nurse Riya Kapoor", to: "/partner"   },
                { label: "Admin →",   role: "super_admin" as Role, name: "Admin Super",       to: "/dashboard" },
              ]).map(({ label, role: r, name: n, to }) => (
                <button
                  key={label}
                  type="button"
                  disabled={loading}
                  onClick={() => quickLogin(r, n, to)}
                  className="text-[12px] text-center px-2 py-2 rounded-md border border-border hover:bg-secondary disabled:opacity-60 transition"
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Demo shortcuts use seed accounts (OTP: 123456)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}