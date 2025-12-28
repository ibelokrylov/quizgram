import { AppSidebar } from "@/components/app-sidebar";
import { OTPForm } from "@/components/otp-form";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AuthContext } from "@/entities/User/auth.context";
import { LoginPage } from "@/pages/Login";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useContext } from "react";

export const Route = createFileRoute("/app")({
  component: RouteComponent,
});

function RouteComponent() {
  const ctx = useContext(AuthContext);

  if (!ctx.isAuth) {
    return <LoginPage />;
  }

  if (!ctx.user?.isVerification) {
    return <OTPForm formType="email" />;
  }
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="floating" />
      <SidebarInset>
        <SiteHeader />
        <div className={"pb-6"}>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
