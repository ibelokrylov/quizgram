import { set } from "@/app/db/index-db";
import { createContext, useState, type PropsWithChildren } from "react";
import type { Quiz } from "./quiz.type";

// eslint-disable-next-line react-refresh/only-export-components
export const CreateQuizContext = createContext<CreateQuizContextType>({
	quiz: undefined,
	setQuiz: () => {},
	isLoadToServer: false,
	setIsLoadToServer: () => {},
});

export type CreateQuizContextType = {
	quiz: Quiz | undefined;
	setQuiz: (quiz: Quiz | undefined) => void;
	isLoadToServer: boolean;
	setIsLoadToServer: (isLoadToServer: boolean) => void;
};

export const CreateQuizContextProvider = (
	props: PropsWithChildren<{ quiz: Quiz; isLoadToServer: boolean }>,
) => {
	const [quiz, setQuiz] = useState<Quiz | undefined>(props.quiz);
	const [isLoadToServer, setIsLoadToServer] = useState<boolean>(
		props.isLoadToServer,
	);

	async function saveQuizData(q: Quiz): Promise<void> {
		if (!quiz?.uid) {
			return;
		}
		await set(quiz.uid, { data: q, isLoadToServer: false });
		setIsLoadToServer(false);
	}

	function onChangeQuiz(q: Quiz | undefined): void {
		if (!q) {
			return;
		}
		saveQuizData(q);
		setQuiz(q);
	}

	return (
		<CreateQuizContext.Provider
			value={{ quiz, setQuiz: onChangeQuiz, isLoadToServer, setIsLoadToServer }}
		>
			{props.children}
		</CreateQuizContext.Provider>
	);
};
