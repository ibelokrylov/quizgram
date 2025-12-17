import { ContextHole } from "@/app/context/context.hole";
import { queryClinet } from "@/app/query-client";
import NotFound from "@/pages/404";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

const RootLayout = () => (
	<QueryClientProvider client={queryClinet}>
		<ContextHole>
			<Outlet />
			<Toaster />
		</ContextHole>
	</QueryClientProvider>
);

export const Route = createRootRoute({
	component: RootLayout,
	notFoundComponent: NotFound,
});
