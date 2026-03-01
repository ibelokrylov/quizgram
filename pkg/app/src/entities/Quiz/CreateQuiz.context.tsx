import { createContext, useState, type PropsWithChildren } from 'react';
import type { Quiz } from './quiz.type';
import { set } from '@/app/db/index-db';

export const CreateQuizContext = createContext<CreateQuizContextType>({
  quiz: undefined,
  setQuiz: () => {},
});

export type CreateQuizContextType = {
  quiz: (Quiz & { isLoadToServer: boolean }) | undefined;
  setQuiz: (quiz: Quiz | undefined, isLoadToServer?: boolean) => void;
};

export const CreateQuizContextProvider = (
  props: PropsWithChildren<{ quiz: Quiz; isLoadToServer: boolean }>
) => {
  const [quiz, setQuiz] = useState<(Quiz & { isLoadToServer: boolean }) | undefined>({
    ...props.quiz,
    isLoadToServer: props.isLoadToServer,
  });

  function onChangeQuiz(q: Quiz | undefined, load = false): void {
    if (!q) {
      setQuiz(q);
      return;
    }
    setQuiz({ ...q, isLoadToServer: load });
    set(q.uid, { data: q, isLoadToServer: load });
  }

  return (
    <CreateQuizContext.Provider value={{ quiz, setQuiz: onChangeQuiz }}>
      {props.children}
    </CreateQuizContext.Provider>
  );
};
