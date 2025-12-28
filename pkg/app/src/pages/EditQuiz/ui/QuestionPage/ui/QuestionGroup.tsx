import type { Quiz, QuizQuestionGroup } from "@/entities/Quiz/quiz.type";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { v7 } from "uuid";
import { Question } from "./Question";

export const QuestionGroup = (props: {
  question: Quiz["question"][0];
  setQuestion: (question: Quiz["question"][0]) => void;
}) => {
  const content = props.question?.content as QuizQuestionGroup;
  const { t } = useTranslation();

  useEffect(() => {
    if (content === undefined) return;

    if (!content?.questions?.length) {
      props.setQuestion({
        ...props.question,
        content: {
          title: props.question.content?.title ?? "Заголовок группы вопросов",
          questions: [{ uid: v7() }],
        },
      } as Quiz["question"][0]);
    }
  }, [content]);

  return (
    <div className="flex flex-col gap-5">
      <Question
        showGroup={false}
        questions={content?.questions ?? []}
        onChange={(questions) =>
          props.setQuestion({
            ...props.question,
            content: {
              title: props.question?.content?.title,
              questions: questions,
            },
          } as Quiz["question"][0])
        }
        addButtonLabel={t("edit-quiz.question-page.add-question")}
      />
    </div>
  );
};
