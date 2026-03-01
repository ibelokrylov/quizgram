import { AppContext } from '@/app/context/app.context';
import { AppSidebar } from '@/components/app-sidebar';
import { Loader } from '@/components/loader';
import { OTPForm } from '@/components/otp-form';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AuthContext } from '@/entities/User/auth.context';
import { LoginPage } from '@/pages/Login';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { useContext } from 'react';

export const Route = createFileRoute('/app')({
  component: RouteComponent,
});

function RouteComponent() {
  const ctx = useContext(AuthContext);
  const appCtx = useContext(AppContext);

  if (appCtx.loading) {
    return (
      <div className={'flex flex-col items-center justify-center w-screen h-screen'}>
        <Loader />
      </div>
    );
  }

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
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="floating" />
      <SidebarInset>
        <SiteHeader />
        <div>
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
