import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { DomainProvider } from "@/lib/domain";

export const Route = createFileRoute("/_app")({
  component: () => (
    <DomainProvider>
      <AppShell />
    </DomainProvider>
  ),
});

// Outlet rendered inside AppShell
// export { Outlet };
