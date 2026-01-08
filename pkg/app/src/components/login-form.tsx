import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthContext } from "@/entities/User/auth.context";
import { loginUser, type LoginUser } from "@/entities/User/LoginUser.type";
import type { User } from "@/entities/User/User.type";
import { useUserPlan } from "@/entities/User/useUserPlan";
import http from "@/lib/http";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useTranslation();
  const { query } = useUserPlan();
  const [data, setData] = useState<LoginUser>({
    login: "",
    password: "",
  });
  const [error, setError] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(false);

  const ctx = useContext(AuthContext);

  function onChange(v: string, type: "password" | "login") {
    setData({ ...data, [type]: v });
    setError({ ...error, [type]: false });
  }

  async function login() {
    try {
      setError(null);
      setLoading(true);
      const error = loginUser.safeParse(data);
      if (error.error) {
        const parse = JSON.parse(error.error.message);
        let err = {};
        for (const e of parse) {
          err = { ...err, [e.path[0]]: true };
        }
        if (Object.keys(err).length > 0) {
          setError(err);
        }
        setLoading(false);
        return;
      }
      const res = await http<User>({
        url: "/v1/auth/login",
        method: "POST",
        body: data,
      });
      if (res.data) {
        ctx.setUser(res.data);
        ctx.setIsAuth(true);
        setLoading(false);
        query.refetch();
      }
    } catch (e) {
      toast.error("Not auth");
      console.log(e);
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{t("login.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">{t("login.email")}</FieldLabel>
              <Input
                disabled={loading}
                id="email"
                type="email"
                placeholder="m@example.com"
                aria-invalid={error?.login ?? false}
                value={data.login}
                onChange={(e) => onChange(e.target.value, "login")}
                required
              />
            </Field>
            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">
                  {t("login.password")}
                </FieldLabel>
                <Link
                  to="/forgot-password"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  {t("login.forgot")}
                </Link>
              </div>
              <Input
                disabled={loading}
                aria-invalid={error?.password ?? false}
                id="password"
                type="password"
                required
                value={data.password}
                onChange={(e) => onChange(e.target.value, "password")}
              />
            </Field>
            <Field>
              <Button
                disabled={loading || !data.login || !data.password}
                onClick={login}
              >
                {t("login.button")}
              </Button>
              <FieldDescription className="text-center">
                <Link to="/registration">{t("login.registration")}</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}
