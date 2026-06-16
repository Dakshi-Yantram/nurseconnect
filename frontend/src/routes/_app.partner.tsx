import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/partner")({
  component: () => <Outlet />,
});
