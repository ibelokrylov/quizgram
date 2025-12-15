import type { Quiz, QuizQuestionType } from "@/entities/Quiz/quiz.type";

import { useTranslation } from "react-i18next";
import { questionTypes } from "../const/question.type";

export const EmptyQuestion = ({
	question,
	setQuestion,
	showGroup = true,
}: {
	question: Quiz["question"][0];
	setQuestion: (question: Quiz["question"][0]) => void;
	showGroup?: boolean;
}) => {
	const { t } = useTranslation();

	function updateTypeQuestion(type: QuizQuestionType) {
		setQuestion({ ...question, type });
	}

	return (
		<div className={"grid grid-cols-1 md:grid-cols-2 gap-2"}>
			{showGroup
				? questionTypes.map((type) => (
						<div
							key={type.type}
							onClick={() => updateTypeQuestion(type.type as QuizQuestionType)}
							className="flex gap-3 items-center bg-gray-100 dark:bg-neutral-800 rounded-md p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-neutral-700"
						>
							{type.icon}
							<div className={"text-md"}>{t(type.title)}</div>
						</div>
					))
				: questionTypes
						.filter((type) => type.type !== "question_group")
						.map((type) => (
							<div
								key={type.type}
								onClick={() =>
									updateTypeQuestion(type.type as QuizQuestionType)
								}
								className="flex gap-3 items-center bg-gray-100 dark:bg-neutral-800 rounded-md p-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-neutral-700"
							>
								{type.icon}
								<div className={"text-md"}>{t(type.title)}</div>
							</div>
						))}
		</div>
	);
};
