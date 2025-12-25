import { set } from "@/app/db/index-db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputNoBorder } from "@/components/ui/input-no-border";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { CreateQuizContext } from "@/entities/Quiz/CreateQuiz.context";
import type { Quiz } from "@/entities/Quiz/quiz.type";
import { AuthContext } from "@/entities/User/auth.context";
import http from "@/lib/http";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
	GalleryVerticalEnd,
	LaptopMinimalCheck,
	List,
	PanelTop,
	UserSearch,
} from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CiSaveUp1 } from "react-icons/ci";
import { toast } from "sonner";
import { ContactsPage } from "./ui/ContactsPage";
import { QuestionPage } from "./ui/QuestionPage";
import { ResultPage } from "./ui/ResultPage";
import { StartPage } from "./ui/StartPage";
import { ThxPage } from "./ui/ThxPage";

const planStages = {
	1: new Set(["start", "question", "contacts", "thx"]),
	2: new Set(["start", "question", "result", "contacts", "thx"]),
};

const icons = {
	start: <PanelTop />,
	question: <List />,
	contacts: <UserSearch />,
	thx: <LaptopMinimalCheck />,
	result: <GalleryVerticalEnd />,
};

const renderStage = {
	start: <StartPage />,
	question: <QuestionPage />,
	contacts: <ContactsPage />,
	thx: <ThxPage />,
	result: <ResultPage />,
};

type QuizUpdateResponse = {
	ok: string[];
	errors: string[];
};

// Type guards для безопасного доступа к объектам по ключам
function isValidPlanStageKey(key: number | undefined): key is keyof typeof planStages {
	return key !== undefined && key in planStages;
}

function isValidIconKey(key: string): key is keyof typeof icons {
	return key in icons;
}

function isValidStageKey(key: string): key is keyof typeof renderStage {
	return key in renderStage;
}

export const EditQuiz = () => {
	const { user } = useContext(AuthContext);
	const { quiz, isLoadToServer, setQuiz, setIsLoadToServer } =
		useContext(CreateQuizContext);
	const { t } = useTranslation();
	const currentStages =
		planStages[isValidPlanStageKey(user?.planId) ? user.planId : 1] ?? planStages[1];
	const location = useLocation();
	const navigate = useNavigate();
	const [name, setName] = useState(quiz?.name);
	const [active, setActive] = useState(quiz?.isActive);
	const [isMobile, setIsMobile] = useState(false);
	const nameContainerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState<number | undefined>(
		undefined,
	);

	const [stage, setStage] = useState<string>(
		currentStages?.has(location.hash) ? location.hash : "start",
	);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 1024);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	useEffect(() => {
		if (!nameContainerRef.current || !isMobile) {
			setContainerWidth(undefined);
			return;
		}
		const updateWidth = () => {
			if (nameContainerRef.current) {
				setContainerWidth(nameContainerRef.current.offsetWidth);
			}
		};
		updateWidth();

		const resizeObserver = new ResizeObserver(() => {
			updateWidth();
		});
		resizeObserver.observe(nameContainerRef.current);

		window.addEventListener("resize", updateWidth);
		return () => {
			resizeObserver.disconnect();
			window.removeEventListener("resize", updateWidth);
		};
	}, [isMobile]);
	function handleStageChange(stage: string) {
		if (currentStages?.has(stage)) {
			setStage(stage);
			navigate({ hash: stage });
		}
	}

	async function toggleActive() {
		try {
			await http({ url: `/v1/quiz/active/${quiz?.uid}`, method: "POST" });
			toast.success(t("edit-quiz.active.success"));
			setActive(!active);
			if (quiz) {
				setQuiz({ ...quiz, isActive: !active } as Quiz);
			}
		} catch (err) {
			console.log(err);
		}
	}

	async function updateName() {
		if (!quiz?.uid || !name) {
			return;
		}
		if (quiz?.name === name) {
			return;
		}
		try {
			await http({
				url: `/v1/quiz/name/${quiz?.uid}`,
				method: "PUT",
				body: { name },
			});
			if (quiz) {
				setQuiz({ ...quiz, name } as Quiz);
			}
		} catch (err) {
			console.log(err);
		}
	}

	async function saveToServer() {
		if (isLoadToServer) {
			toast.error(t("toast.error.quiz-load"));
			return;
		}
		if (!quiz?.uid) {
			return;
		}
		try {
			const response = await http({
				url: "/v1/quiz/" + quiz?.uid,
				body: {
					startPage: quiz?.startPage,
					questionTitle: quiz?.questionTitle,
					question: quiz?.question,
					contact: quiz?.contact,
					thxPage: quiz?.thxPage,
				},
				method: "PUT",
			});
			console.log(response);

			// Сервер возвращает { ok: string[], errors: string[] } напрямую
			// Функция http возвращает HttpResponse<T>, где T - это тип данных
			// TODO: Добавить Zod валидацию для response
			const result = (response.data || response) as unknown as QuizUpdateResponse;
			if (!result.errors || result.errors.length === 0) {
				await set(quiz.uid, { data: quiz, isLoadToServer: true });
				setIsLoadToServer(true);
			}
		} catch (err) {
			console.log(err);
			toast.error(t("toast.error.quiz-not-load"));
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col lg:flex-row gap-3 lg:gap-5 pt-3 px-4 lg:px-0 lg:items-center">
				<div
					ref={nameContainerRef}
					className="w-full lg:w-auto [&>div]:block lg:[&>div]:inline-block [&>div]:w-full lg:[&>div]:w-auto [&>div>input]:!w-full lg:[&>div>input]:!w-auto [&>div>input]:!max-w-full lg:[&>div>input]:!max-w-none"
				>
					<InputNoBorder
						key={quiz?.name}
						value={name}
						maxLength={60}
						maxWidth={isMobile && containerWidth ? containerWidth : undefined}
						initialWidth={isMobile && containerWidth ? containerWidth : 200}
						onChange={(e) => setName(e.target.value)}
						onBlur={updateName}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								updateName();
							}
						}}
					/>
				</div>
				<div className="hidden lg:block">
					<Separator orientation="vertical" />
				</div>
				<div className="flex flex-row gap-3 lg:gap-5 items-center justify-between lg:justify-start pt-2 pb-2 lg:pt-0 lg:pb-0">
					<div
						onClick={toggleActive}
						className={"flex flex-row gap-2 items-center cursor-pointer"}
					>
						<Switch id={"active-switch"} checked={active} />
						<Label htmlFor={"active-switch"}>
							{t(`edit-quiz.active.${active?.toString() ?? "false"}`)}
						</Label>
					</div>
					<div className="hidden lg:block">
						<Separator orientation="vertical" />
					</div>
					<div className="flex items-center">
						{!isLoadToServer ? (
							<Button onClick={saveToServer} color={"primary"}>
								<CiSaveUp1 />
								{t("edit-quiz.publish")}
							</Button>
						) : (
							<div
								className={
									"text-xs text-gray-500 dark:text-gray-400"
								}
							>
								{t("edit-quiz.updated-at", {
									date: format(
										quiz?.updatedAt ?? new Date(),
										"dd.MM.yyyy HH:mm:ss",
									),
								})}
							</div>
						)}
					</div>
				</div>
			</div>
			<Separator />
			<div
				className={`grid grid-cols-2 lg:grid-cols-5 gap-2 pt-2 max-w-[1000px] w-full px-2 lg:px-0`}
			>
				{[...currentStages].map((st) => (
					<Card
						key={st}
						onClick={() => handleStageChange(st)}
						className={cn(
							st === stage
								? "bg-accent text-accent-foreground"
								: "bg-secondary text-secondary-foreground dark:bg-background/80 dark:border-input/80 dark:text-foreground dark:hover:bg-accent/30",
							"cursor-pointer p-4 transition-all",
						)}
					>
						<div className="flex flex-row gap-2 items-center">
							<div>{isValidIconKey(st) ? icons[st] : null}</div>
							<div>{t(`edit-quiz.stages.${st}`)}</div>
						</div>
					</Card>
				))}
			</div>
			<Separator />
			<div key={quiz?.uid}>
				{isValidStageKey(stage) ? renderStage[stage] : null}
			</div>
		</div>
	);
};
