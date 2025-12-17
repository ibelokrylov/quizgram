import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/entities/User/auth.context";
import http from "@/lib/http";
import { Button } from "./ui/button";

export const LanguageToggle = () => {
	const { i18n } = useTranslation();
	const { isAuth, setUser, user } = useContext(AuthContext);
	const queryClient = useQueryClient();

	const currentLanguage = i18n.language || "en";
	const isRussian =
		currentLanguage === "ru" || currentLanguage.startsWith("ru");

	const toggleLanguage = async () => {
		const newLanguage = isRussian ? "en" : "ru";

		// Меняем язык в интерфейсе
		await i18n.changeLanguage(newLanguage);

		// Если пользователь авторизован, отправляем язык на сервер
		if (isAuth) {
			try {
				await http({
					url: "/v1/user/language",
					method: "PUT",
					body: { language: newLanguage },
				});

				// Обновляем данные пользователя в контексте и кэше
				if (user) {
					const updatedUser = { ...user, language: newLanguage };
					setUser(updatedUser);

					// Обновляем кэш React Query
					queryClient.setQueryData(["user"], updatedUser);
				}
			} catch (error) {
				console.error("Ошибка при сохранении языка:", error);
				// В случае ошибки не откатываем изменение языка в интерфейсе
			}
		}
	};

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={toggleLanguage}
			aria-label={isRussian ? "Switch to English" : "Переключить на русский"}
			className="min-w-9 max-w-9"
		>
			{isRussian ? "EN" : "RU"}
		</Button>
	);
};
