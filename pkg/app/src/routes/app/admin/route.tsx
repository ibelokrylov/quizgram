import { AuthContext } from '@/entities/User/auth.context';
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useContext } from 'react';

export const Route = createFileRoute('/app/admin')({
  component: RouteComponent,
});

function RouteComponent() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  if (!user?.isAdmin) {
    navigate({ to: '/app' });
  }
  return <Outlet />;
}
