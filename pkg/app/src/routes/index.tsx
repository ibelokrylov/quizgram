import { AuthContext } from "@/entities/User/auth.context";
import { LoginPage } from "@/pages/Login";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useContext, useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const ctx = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (ctx.isAuth) {
      navigate({ to: "/app" });
    }
  }, [ctx.isAuth]);

  return <LoginPage />;
}
