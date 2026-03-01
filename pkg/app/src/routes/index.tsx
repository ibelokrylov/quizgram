import { AppContext } from '@/app/context/app.context';
import { Loader } from '@/components/loader';
import { AuthContext } from '@/entities/User/auth.context';
import { LoginPage } from '@/pages/Login';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useContext, useEffect } from 'react';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  const ctx = useContext(AuthContext);
  const appCtx = useContext(AppContext);

  const navigate = useNavigate();

  useEffect(() => {
    if (ctx.isAuth) {
      navigate({ to: '/app' });
    }
  }, [ctx.isAuth]);

  return appCtx?.loading ? (
    <div className="flex flex-col items-center justify-center w-screen h-screen">
      <Loader />
    </div>
  ) : (
    <LoginPage />
  );
}
