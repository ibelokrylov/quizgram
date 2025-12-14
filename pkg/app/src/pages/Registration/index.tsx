import { SignupForm } from "@/components/signup-form";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";

export const RegistrationPage = () => {
	return (
		<div className="flex min-h-svh w-full flex-col p-6 md:p-10">
			<div className="mx-auto w-full max-w-[1200px]">
				{/* Кнопки переключения темы и языка в самом верху страницы */}
				<div className="flex justify-end gap-2 pb-6 md:pb-10">
					<ThemeToggle />
					<LanguageToggle />
				</div>
				{/* Основной контент */}
				<div className="flex w-full items-center justify-center">
					<div className="w-full max-w-sm">
						<SignupForm />
					</div>
				</div>
			</div>
		</div>
	);
};
