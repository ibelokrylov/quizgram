import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Quiz } from "@/entities/Quiz/quiz.type";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useEffect, useState, type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { questionTypes } from "../const/question.type";

export const QuestionLayout = ({
	children,
	index,
	setQuestion,
	moveQuestionUp,
	moveQuestionDown,
	question,
	deleteQuestion,
}: PropsWithChildren & {
	setQuestion: (q: Quiz["question"][0]) => void;
	question: Quiz["question"][0];
	deleteQuestion: (uid: string) => void;
	index: number;
	moveQuestionUp: (index: number) => void;
	moveQuestionDown: (index: number) => void;
}) => {
	const { t } = useTranslation();
	const [title, setTitle] = useState<string>(question?.content?.title ?? "");

	useEffect(() => {
		if (title !== question?.content?.title) {
			setQuestion({ ...question, content: { ...question.content, title } });
		}
	}, [title]);

	return (
		<Card className="p-1.5 md:p-2 relative" key={question.uid}>
			<CardHeader className="px-3 md:px-4 pt-2.5 md:pt-3 pb-1.5 md:pb-2">
				<CardTitle>
					<div className={"flex items-center justify-between"}>
						<div className="flex items-center gap-2 w-[calc(100%-100px)]">
							{question?.type ? (
								<Tooltip>
									<TooltipTrigger asChild>
										{questionTypes.find((t) => t.type === question.type)?.icon}
									</TooltipTrigger>
									<TooltipContent>
										<p>{t("question_types." + question.type)}</p>
									</TooltipContent>
								</Tooltip>
							) : null}
							<Input
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder={t("edit-quiz.question-page.question.placeholder")}
							/>
						</div>
						<div className={"flex items-center gap-2"}>
							<div className={"flex gap-1"}>
								<Button
									onClick={() => moveQuestionUp(index)}
									variant={"outline"}
									size={"icon-sm"}
								>
									<ChevronUp />
								</Button>
								<Button
									onClick={() => moveQuestionDown(index)}
									variant={"outline"}
									size={"icon-sm"}
								>
									<ChevronDown />
								</Button>
							</div>
							<div
								className={
									"text-sm text-gray-500 w-4 h-4 rounded-full bg-gray-100 dark:bg-neutral-800  flex items-center justify-center"
								}
							>
								{index + 1}
							</div>
						</div>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="px-3 md:px-4 pb-3 md:pb-4 pt-1">{children}</CardContent>
			<div className="flex justify-end px-3 md:px-4 pb-2.5 md:pb-3">
				<div>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={"outline"}
								onClick={() => deleteQuestion(question.uid)}
							>
								<Trash2 />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>{t("tooltip.delete")}</p>
						</TooltipContent>
					</Tooltip>
				</div>
			</div>
		</Card>
	);
};
