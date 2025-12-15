import { ContextHole } from "@/app/context/context.hole";
import { queryClinet } from "@/app/query-client";
import NotFound from "@/pages/404";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppRoot } from "@telegram-apps/telegram-ui";
import { Toaster } from "sonner";

const RootLayout = () => (
  <QueryClientProvider client={queryClinet}>
    <AppRoot>
      <ContextHole>
        <Outlet />
        <Toaster />
      </ContextHole>
    </AppRoot>
  </QueryClientProvider>
);

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});
