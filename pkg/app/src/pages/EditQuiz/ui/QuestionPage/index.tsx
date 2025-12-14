import { InputNoBorder } from "@/components/ui/input-no-border";
import { Separator } from "@/components/ui/separator";
import { CreateQuizContext } from "@/entities/Quiz/CreateQuiz.context";
import type { Quiz } from "@/entities/Quiz/quiz.type";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { Question } from "./ui/Question";

export const QuestionPage = () => {
	const { quiz, setQuiz } = useContext(CreateQuizContext);
	const { t } = useTranslation();

	const [title, setTitle] = useState(quiz?.questionTitle ?? "");

	const handleQuestionsChange = (nextQuestions: Quiz["question"]) => {
		setQuiz({ ...quiz, question: nextQuestions } as Quiz);
	};

	return (
		<div>
			<InputNoBorder
				value={title}
				placeholder={t("edit-quiz.question-page.title.placeholder")}
				className="h-12 text-xl! placeholder:text-xl"
				initialWidth={300}
				maxLength={100}
				onChange={(e) => setTitle(e.target.value)}
				onBlur={() => setQuiz({ ...quiz, questionTitle: title } as Quiz)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						setQuiz({ ...quiz, questionTitle: title } as Quiz);
					}
				}}
			/>
			<div className={"flex flex-col gap-7 pt-2 max-w-[1000px]"}>
				<Separator />
				<Question
					questions={quiz?.question ?? []}
					onChange={handleQuestionsChange}
					addButtonLabel={t("edit-quiz.question-page.add-question")}
				/>
			</div>
		</div>
	);
};
