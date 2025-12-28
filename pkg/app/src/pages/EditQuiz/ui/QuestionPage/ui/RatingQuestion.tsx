import { Input } from "@/components/ui/input";
import type { Quiz, QuizQuestionRating } from "@/entities/Quiz/quiz.type";
import { Star } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export const RatingQuestion = ({
  question,
  setQuestion,
}: {
  question: Quiz["question"][0];
  setQuestion: (question: Quiz["question"][0]) => void;
}) => {
  const content = question?.content as QuizQuestionRating;
  const { t } = useTranslation();

  useEffect(() => {
    if (!content?.left_placeholder || !content?.right_placeholder) {
      setQuestion({
        ...question,
        content: {
          left_placeholder: t("edit-quiz.question-page.question.rating.left_placeholder"),
          right_placeholder: t("edit-quiz.question-page.question.rating.right_placeholder"),
        },
      });
    }
  }, [content]);

  return (
    <div className="flex flex-col gap-3">
      <div className={"flex items-center gap-4"}>
        <Star className={"text-yellow-500"} size={50} />
        <Star className={"text-yellow-500"} size={50} />
        <Star size={50} />
        <Star size={50} />
        <Star size={50} />
      </div>
      <div className={"flex items-center gap-2"}>
        <Input
          className="w-[150px]"
          value={content?.left_placeholder}
          onChange={(e) =>
            setQuestion({
              ...question,
              content: { ...content, left_placeholder: e.target.value },
            })
          }
        />
        <Input
          className="w-[150px]"
          value={content?.right_placeholder}
          onChange={(e) =>
            setQuestion({
              ...question,
              content: { ...content, right_placeholder: e.target.value },
            })
          }
        />
      </div>
    </div>
  );
};
