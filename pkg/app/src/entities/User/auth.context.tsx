import { createContext } from "react";
import type { User } from "../User/User.type";

export const AuthContext = createContext<AuthContext>({
  isAuth: false,
  user: undefined,
  setIsAuth: () => {},
  setUser: () => {},
});

export type AuthContext = {
  isAuth: boolean;
  setIsAuth: (v: boolean) => void;
  user?: User;
  setUser: (v: undefined | User) => void;
};
