import { Checkbox } from "@/components/ui/checkbox";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QuizThxPageSocial } from "@/entities/Quiz/quiz.type";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

type Props = {
	social: QuizThxPageSocial[];
	setSocial: (social: QuizThxPageSocial[]) => void;
	open: boolean;
	setOpen: (open: boolean) => void;
};

const socialList = [
	"Instagram",
	"Vk",
	"Youtube",
	"Facebook",
	"X",
	"Telegram",
	"Tiktok",
	"Wechat",
	"WhatsApp",
	"LinkedIn",
	"E-mail",
];
const meta = new Set(["Instagram", "WhatsApp", "Facebook"]);

export const SocialEditor = (props: Props) => {
	const { t } = useTranslation();
	const [social, setSocial] = useState<QuizThxPageSocial[]>(props.social ?? []);

	const selectedSocial = useMemo(() => {
		return new Set(social.map((i) => i.type));
	}, [social]);

	const isValidUrl = useCallback((url: string) => {
		try {
			new URL(url);
			return true;
		} catch (error) {
			return false;
		}
	}, []);

	const validatedSocial = useMemo(() => {
		return social.filter((i) => i.type && i.link && isValidUrl(i.link));
	}, [social, isValidUrl]);

	useEffect(() => {
		if (validatedSocial.length) {
			props.setSocial(validatedSocial);
		} else {
			props.setSocial([]);
		}
	}, [validatedSocial]);

	return (
		<Drawer open={props.open} onOpenChange={props.setOpen}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>{t("edit-quiz.thx-page.social.title")}</DrawerTitle>
				</DrawerHeader>
				<div
					className={
						"flex flex-col gap-6 w-full max-w-[414px] mx-auto pb-5 overflow-y-auto"
					}
				>
					{socialList.map((item) => (
						<div key={item} className={"flex flex-col gap-2"}>
							<div className={"flex items-center gap-2"}>
								<Checkbox
									onCheckedChange={(checked) => {
										if (checked) {
											setSocial([...social, { type: item, link: "" }]);
										} else {
											setSocial(social.filter((i) => i.type !== item));
										}
									}}
									id={item}
									defaultChecked={selectedSocial.has(item)}
								/>
								<Label htmlFor={item}>
									{item}
									{meta.has(item) ? "*" : null}
								</Label>
							</div>
							{selectedSocial.has(item) && (
								<div>
									<Input
										value={social.find((i) => i.type === item)?.link ?? ""}
										onChange={(e) =>
											setSocial(
												social.map((i) =>
													i.type === item ? { ...i, link: e.target.value } : i,
												),
											)
										}
									/>
								</div>
							)}
						</div>
					))}
				</div>
				<div className={"text-center text-sm text-gray-500 mx-auto pb-3"}>
					* Продукт компании Meta, признана экстремистcкой организацией в России
				</div>
			</DrawerContent>
		</Drawer>
	);
};
