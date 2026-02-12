import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Quiz, QuizQuestionFile } from "@/entities/Quiz/quiz.type";
import { v7 } from "uuid";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

export const FileQuestion = ({
  question,
  setQuestion,
}: {
  question: Quiz["question"][0];
  setQuestion: (question: Quiz["question"][0]) => void;
}) => {
  const content = question?.content as QuizQuestionFile;
  const { t } = useTranslation();

  useEffect(() => {
    if (!content.type && !content.title) {
      setQuestion({
        ...question,
        content: {
          type: "image",
          title: "Заголовок вопроса",
          required: true,
          description: undefined,
          manyFiles: false,
        },
      });
    }
  }, [content]);

  const id = useMemo(() => v7(), []);
  const id2 = useMemo(() => v7(), []);
  const idDesc = useMemo(() => v7(), []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>{t("edit-quiz.question-page.question.file.title")}</Label>
        <Select
          value={content?.type}
          defaultValue="image"
          onValueChange={(value) =>
            setQuestion({
              ...question,
              content: { ...content, type: value as QuizQuestionFile["type"] },
            })
          }
        >
          <SelectTrigger>
            <SelectValue
              placeholder={t("edit-quiz.question-page.question.file.type")}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>
                {t("edit-quiz.question-page.question.file.type")}
              </SelectLabel>
              <SelectItem value="all">
                {t("edit-quiz.question-page.question.file.type.all")}
              </SelectItem>
              <SelectItem value="image">
                {t("edit-quiz.question-page.question.file.type.image")}
              </SelectItem>
              <SelectItem value="video">
                {t("edit-quiz.question-page.question.file.type.video")}
              </SelectItem>
              <SelectItem value="docs">
                {t("edit-quiz.question-page.question.file.type.docs")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={idDesc}>Описание</Label>
        <Textarea
          id={idDesc}
          value={content?.description}
          onChange={(e) =>
            setQuestion({
              ...question,
              content: { ...content, description: e.target.value },
            })
          }
        />
      </div>
      <div className="flex gap-2">
        <Checkbox
          id={id}
          checked={content?.manyFiles}
          onCheckedChange={(e) =>
            setQuestion({ ...question, content: { ...content, manyFiles: e } })
          }
        />
        <Label htmlFor={id}>
          Разрешить загрузку нескольких файлов (лимит 10)
        </Label>
      </div>
      <div className="flex gap-2">
        <Checkbox
          id={id2}
          checked={content?.required}
          onCheckedChange={(e) =>
            setQuestion({ ...question, content: { ...content, required: e } })
          }
        />
        <Label htmlFor={id2}>Обязательно к заполнению</Label>
      </div>
    </div>
  );
};
