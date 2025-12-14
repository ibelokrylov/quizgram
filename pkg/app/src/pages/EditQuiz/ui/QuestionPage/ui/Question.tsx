import { Button } from "@/components/ui/button";
import { CopyToClick } from "@/components/ui/copy-to-click";
import { Separator } from "@/components/ui/separator";
import type { Quiz } from "@/entities/Quiz/quiz.type";
import { Plus } from "lucide-react";
import { v7 } from "uuid";
import { AnswerOption } from "./AnswerOption";
import { DateQuestion } from "./DateQuestion";
import { EmptyQuestion } from "./EmptyQuestion";
import { FileQuestion } from "./FileQuestion";
import { InputQuestion } from "./InputQuestion";
import { PageQuestion } from "./PageQuestion";
import { QuestionGroup } from "./QuestionGroup";
import { QuestionLayout } from "./QuestionLayout";
import { RatingQuestion } from "./RatingQuestion";
import { SelectQuestion } from "./SelectQuestion";
import { SlideQuestion } from "./SlideQuestion";
import { VariantImage } from "./VariantImage";

type QuestionProps = {
	questions: Quiz["question"];
	onChange: (questions: Quiz["question"]) => void;
	addButtonLabel: string;
	showGroup?: boolean;
};

export const Question = ({
	questions,
	onChange,
	addButtonLabel,
	showGroup = true,
}: QuestionProps) => {
	const updateQuestions = (next: Quiz["question"]) => {
		onChange(next);
	};

	const addQuestion = () => {
		const question: Quiz["question"][0] = {
			uid: v7(),
		};
		updateQuestions([...questions, question]);
	};

	const setQuestion = (question: Quiz["question"][0], idx: number) => {
		const next = [...questions];
		next[idx] = question;
		updateQuestions(next);
	};

	const updateQuestion = (question: Quiz["question"][0]) => {
		const next = questions.map((q) => (q.uid === question.uid ? question : q));
		updateQuestions(next);
	};

	const deleteQuestion = (uid: string) => {
		updateQuestions(questions.filter((question) => question.uid !== uid));
	};

	const moveQuestionUp = (index: number) => {
		if (index === 0) return;
		const next = [...questions];
		[next[index - 1], next[index]] = [next[index], next[index - 1]];
		updateQuestions(next);
	};

	const moveQuestionDown = (index: number) => {
		if (index === questions.length - 1) return;
		const next = [...questions];
		[next[index], next[index + 1]] = [next[index + 1], next[index]];
		updateQuestions(next);
	};

	const renderQuestion = {
		answer_option: (question: Quiz["question"][0]) => (
			<AnswerOption question={question} setQuestion={updateQuestion} />
		),
		variant_image: (question: Quiz["question"][0]) => (
			<VariantImage question={question} setQuestion={updateQuestion} />
		),
		variant_image_text: (question: Quiz["question"][0]) => (
			<VariantImage
				type="variant_image_text"
				question={question}
				setQuestion={updateQuestion}
			/>
		),
		input: (question: Quiz["question"][0]) => (
			<InputQuestion question={question} setQuestion={updateQuestion} />
		),
		select: (question: Quiz["question"][0]) => (
			<SelectQuestion question={question} setQuestion={updateQuestion} />
		),
		date: (question: Quiz["question"][0]) => (
			<DateQuestion question={question} setQuestion={updateQuestion} />
		),
		slide: (question: Quiz["question"][0]) => (
			<SlideQuestion question={question} setQuestion={updateQuestion} />
		),
		file: (question: Quiz["question"][0]) => (
			<FileQuestion question={question} setQuestion={updateQuestion} />
		),
		page: (question: Quiz["question"][0]) => (
			<PageQuestion question={question} setQuestion={updateQuestion} />
		),
		rating: (question: Quiz["question"][0]) => (
			<RatingQuestion question={question} setQuestion={updateQuestion} />
		),
		question_group: (question: Quiz["question"][0]) => (
			<QuestionGroup question={question} setQuestion={updateQuestion} />
		),
	} as const;
	if (!questions?.length) return null;
	return (
		<>
			{questions?.map((question, index) => (
				<QuestionLayout
					moveQuestionUp={moveQuestionUp}
					moveQuestionDown={moveQuestionDown}
					index={index}
					key={question.uid}
					question={question}
					setQuestion={(q) => setQuestion(q, index)}
					deleteQuestion={() => deleteQuestion(question.uid)}
				>
					<CopyToClick text={question?.uid}>
						<div className="text-xs text-gray-200 dark:text-gray-600 absolute top-[-16px] right-2">
							id: {question?.uid}
						</div>
					</CopyToClick>
					{!question?.type ? (
						<EmptyQuestion
							showGroup={showGroup}
							question={question}
							setQuestion={(q) => setQuestion(q, index)}
						/>
					) : (
						renderQuestion[question.type as keyof typeof renderQuestion]?.(
							question,
						)
					)}
				</QuestionLayout>
			))}
			<Separator />
			<div>
				<Button variant={"outline"} onClick={addQuestion}>
					<Plus /> {addButtonLabel}
				</Button>
			</div>
		</>
	);
};
