import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Quiz, QuizQuestionAnswerOptions } from "@/entities/Quiz/quiz.type";
import { Plus, Trash } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export const AnswerOption = ({
  question,
  setQuestion,
}: {
  question: Quiz["question"][0];
  setQuestion: (question: Quiz["question"][0]) => void;
}) => {
  const content = question?.content as QuizQuestionAnswerOptions;
  const { t } = useTranslation();

  function setContent(content: QuizQuestionAnswerOptions) {
    setQuestion({ ...question, content });
  }

  useEffect(() => {
    if (!content?.variants?.length) {
      setContent({ ...content, variants: [""] });
    }
  }, [content]);

  return (
    <div className={"flex flex-col gap-1"}>
      {content?.variants?.map((variant, idx) => (
        <div key={`${question.uid}-${idx}`} className={"flex items-center gap-2"}>
          <Input
            value={variant}
            onChange={(e) =>
              setContent({
                ...content,
                variants: content.variants.map((v, i) => (i === idx ? e.target.value : v)),
              })
            }
            placeholder={t("edit-quiz.question-page.question.new-answer")}
          />
          <Button
            variant={"outline"}
            size={"icon-sm"}
            onClick={() =>
              setContent({
                ...content,
                variants: content.variants.filter((_, i) => i !== idx),
              })
            }
          >
            <Trash />
          </Button>
        </div>
      ))}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={"outline"}
            className={"mt-4"}
            size={"icon-sm"}
            onClick={() => setContent({ ...content, variants: [...content.variants, ""] })}
          >
            <Plus />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("tooltip.add-answer")}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
