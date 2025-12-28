import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Quiz, QuizQuestionInput } from "@/entities/Quiz/quiz.type";
import { useTranslation } from "react-i18next";

export const InputQuestion = ({
  question,
  setQuestion,
}: {
  question: Quiz["question"][0];
  setQuestion: (question: Quiz["question"][0]) => void;
}) => {
  const content = question?.content as QuizQuestionInput;
  const { t } = useTranslation();

  return (
    <div>
      <Input
        id="variant"
        value={content?.variant}
        onChange={(e) =>
          setQuestion({
            ...question,
            content: { ...content, variant: e.target.value },
          })
        }
        placeholder={t("edit-quiz.question-page.question.input.placeholder")}
      />
      <Label htmlFor="variant" className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t("edit-quiz.question-page.question.input.label")}
      </Label>
    </div>
  );
};
