import { AuthContext } from "@/entities/User/auth.context";
import { RegistrationPage } from "@/pages/Registration";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useContext, useEffect } from "react";

export const Route = createFileRoute("/registration")({
	component: RouteComponent,
});

function RouteComponent() {
	const ctx = useContext(AuthContext);
	const navigate = useNavigate();

	useEffect(() => {
		if (ctx.isAuth) {
			navigate({ to: "/app" });
		}
	}, [ctx.isAuth]);
	return <RegistrationPage />;
}
