import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Search, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Breadcrumbs } from "./Breadcrumbs";
import { useAuth } from "@/lib/auth-context";
import { ROLES, portalForRole, portalHome, routeMeta, type Role } from "@/lib/rbac";
import { RoleBadge } from "@/components/shared/RoleBadge";
import { PortalBadge } from "@/components/shared/PortalBadge";

export function TopBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const meta = routeMeta(path);
  const { user, setRole } = useAuth();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentPortal = portalForRole(user?.role ?? null);

  return (
    <header className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 gap-3 sm:gap-4">
        <div className="min-w-0">
          <Breadcrumbs />
          <h1 className="text-[15px] sm:text-[18px] font-semibold text-foreground leading-tight truncate">{meta.title}</h1>
        </div>


        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              placeholder="Search patients, nurses, bookings…"
              aria-label="Search"
              className="w-[280px] xl:w-[320px] pl-9 pr-3 py-2 text-[13px] rounded-md bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button aria-label="Notifications" className="relative h-9 w-9 grid place-items-center rounded-md hover:bg-secondary">
            <Bell className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full" aria-hidden="true" />
          </button>


          {user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-2 border-l border-border h-9"
              >
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-purple grid place-items-center text-white text-[13px] font-semibold">
                  {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="hidden md:block leading-tight text-left">
                  <div className="text-[13px] font-medium text-foreground flex items-center gap-2">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    {currentPortal && <PortalBadge portal={currentPortal} />}
                    <RoleBadge role={user.role} />
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-md border border-border bg-card shadow-lg p-2 z-30"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="px-2 pb-2 mb-2 border-b border-border">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Switch role (demo)</div>
                  </div>
                  <ul className="space-y-0.5">
                    {ROLES.map((r) => (
                      <li key={r.id}>
                        <button
                          onClick={() => {
                            const nextRole = r.id as Role;
                            setRole(nextRole);
                            setMenuOpen(false);
                            // Route to the correct portal home when portal changes.
                            if (portalForRole(nextRole) !== currentPortal) {
                              nav({ to: portalHome(nextRole) });
                            }
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-[12.5px] hover:bg-secondary flex items-center justify-between ${
                            user.role === r.id ? "bg-secondary" : ""
                          }`}
                        >
                          <span>{r.label}</span>
                          {user.role === r.id && <RoleBadge role={r.id as Role} />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
