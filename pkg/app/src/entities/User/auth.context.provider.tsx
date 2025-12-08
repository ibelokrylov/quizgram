import { AppContext } from '@/app/context/app.context';
import { Loader } from '@/components/loader';
import { useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { User } from '../User/User.type';
import { AuthContext } from './auth.context';
import { useUser } from './useUser';

export const AuthContextProvider = (props: PropsWithChildren) => {
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [user, setUser] = useState<undefined | User>(undefined);

  const appCtx = useContext(AppContext);

  const { query } = useUser();

  useEffect(() => {
    if (query.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(query.data);
      setIsAuth(true);
    }
  }, [query.data]);

  useEffect(() => {
    appCtx.setLoading(query.isLoading);
  }, [query.isLoading]);

  return (
    <AuthContext.Provider
      value={{
        isAuth,
        setIsAuth,
        user,
        setUser,
      }}
    >
      {appCtx.loading ? <Loader /> : props.children}
    </AuthContext.Provider>
  );
};
