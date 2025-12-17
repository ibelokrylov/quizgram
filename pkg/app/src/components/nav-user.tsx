import {
	IconCreditCard,
	IconDotsVertical,
	IconLogout,
} from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { AuthContext } from "@/entities/User/auth.context";
import { useUserPlan } from "@/entities/User/useUserPlan";
import http from "@/lib/http";

export function NavUser({
	user,
}: {
	user: {
		name: string;
		email: string;
	};
}) {
	const { isMobile } = useSidebar();
	const { query: planQuery } = useUserPlan();
	const navigate = useNavigate();
	const { setIsAuth, setUser } = useContext(AuthContext);
	const { t } = useTranslation("common");

	const n = user.name
		.split(" ")
		.map((i) => i[0])
		.join("");

	const planName = planQuery.data?.name;

	const handleBilling = () => {
		navigate({ to: "/app/payment" });
	};

	const handleLogout = async () => {
		try {
			await http({
				url: "/v1/auth/logout",
				method: "POST",
			});

			// Очищаем состояние аутентификации
			setIsAuth(false);
			setUser(undefined);

			// Очищаем sessionStorage
			sessionStorage.removeItem("userPlan");

			// Редирект на страницу входа
			navigate({ to: "/" });
		} catch (error) {
			console.error("Ошибка при выходе:", error);
			// Даже при ошибке очищаем состояние и делаем редирект
			setIsAuth(false);
			setUser(undefined);
			sessionStorage.removeItem("userPlan");
			navigate({ to: "/" });
		}
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg grayscale">
								<AvatarFallback className="rounded-lg">{n}</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{user.name}</span>
								<span className="text-muted-foreground truncate text-xs">
									{user.email}
								</span>
								{planName ? (
									<span className="text-muted-foreground truncate text-[10px]">
										{planName}
									</span>
								) : null}
							</div>
							<IconDotsVertical className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarFallback className="rounded-lg">{n}</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{user.name}</span>
									<span className="text-muted-foreground truncate text-xs">
										{user.email}
									</span>
									{planName ? (
										<span className="text-muted-foreground truncate text-[10px]">
											{planName}
										</span>
									) : null}
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							{/* <DropdownMenuItem> */}
							{/*   <IconUserCircle /> */}
							{/*   Account */}
							{/* </DropdownMenuItem> */}
							<DropdownMenuItem onClick={handleBilling}>
								<IconCreditCard />
								{t("nav.user.billing")}
							</DropdownMenuItem>
							{/* <DropdownMenuItem> */}
							{/*   <IconNotification /> */}
							{/*   {t('nav.user.notifications')} */}
							{/* </DropdownMenuItem> */}
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleLogout}>
							<IconLogout />
							{t("nav.user.logout")}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
