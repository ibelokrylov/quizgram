import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Quiz, QuizQuestionDate } from "@/entities/Quiz/quiz.type";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const DateQuestion = ({
  question,
  setQuestion,
}: {
  question: Quiz["question"][0];
  setQuestion: (question: Quiz["question"][0]) => void;
}) => {
  const content = question?.content as QuizQuestionDate;
  const [types, setTypes] = useState<string>("calendar");
  const { t } = useTranslation();

  function onValueChange(v: string) {
    setTypes(v);
    setQuestion({ ...question, content: { ...content, type: v } });
  }

  useEffect(() => {
    if (!content?.type) {
      setQuestion({ ...question, content: { ...content, type: types } });
    }
  }, [content]);

  return (
    <Tabs
      onValueChange={onValueChange}
      defaultValue={types}
      className="w-[400px]"
    >
      <TabsList>
        <TabsTrigger value="calendar">
          {t("edit-quiz.question-page.question.date.calendar")}
        </TabsTrigger>
        <TabsTrigger value="mask">
          {t("edit-quiz.question-page.question.date.mask")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
