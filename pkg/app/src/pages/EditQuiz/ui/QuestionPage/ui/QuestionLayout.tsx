import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Quiz } from "@/entities/Quiz/quiz.type";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { questionTypes } from "../const/question.type";

export const QuestionLayout = ({
  children,
  index,
  setQuestion,
  moveQuestionUp,
  moveQuestionDown,
  question,
  deleteQuestion,
}: PropsWithChildren & {
  setQuestion: (q: Quiz["question"][0]) => void;
  question: Quiz["question"][0];
  deleteQuestion: (uid: string) => void;
  index: number;
  moveQuestionUp: (index: number) => void;
  moveQuestionDown: (index: number) => void;
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState<string>(question?.content?.title ?? "");
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (title !== question?.content?.title) {
      setQuestion({ ...question, content: { ...question.content, title } });
    }
  }, [title]);

  return (
    <div className="relative">
      {question?.type ? (
        <Badge variant="secondary" className="md:hidden absolute -top-2 left-2 z-10">
          {t("question_types." + question.type)}
        </Badge>
      ) : null}
      <Card className="p-1.5 md:p-2 relative" key={question.uid}>
        <CardHeader className="px-3 md:px-4 pt-3 md:pt-3 pb-1.5 md:pb-2">
          <CardTitle>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              {/* Управление (на мобилке сверху) */}
              <div className="flex items-center gap-2 md:order-2">
                <div className={"flex gap-1"}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => moveQuestionUp(index)}
                        variant={"outline"}
                        size={"icon-sm"}
                      >
                        <ChevronUp />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Вверх</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => moveQuestionDown(index)}
                        variant={"outline"}
                        size={"icon-sm"}
                      >
                        <ChevronDown />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Вниз</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div
                  className={
                    "text-sm text-gray-500 w-4 h-4 rounded-full bg-gray-100 dark:bg-neutral-800  flex items-center justify-center"
                  }
                >
                  {index + 1}
                </div>
                <div className="flex items-center gap-2 ml-auto md:ml-10">
                  {isCollapsed && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={"outline"}
                          size={"icon-sm"}
                          onClick={() => deleteQuestion(question.uid)}
                        >
                          <Trash2 />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("tooltip.delete")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-expanded={!isCollapsed}
                        onClick={() => setIsCollapsed((v) => !v)}
                      >
                        {isCollapsed ? <ChevronUp /> : <ChevronDown />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isCollapsed ? "Развернуть" : "Свернуть"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Заголовок (на мобилке снизу) */}
              <div className="flex items-center gap-2 md:order-1 md:w-[calc(100%-220px)]">
                {question?.type ? (
                  <div className="hidden md:block">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {questionTypes.find((t) => t.type === question.type)?.icon}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("question_types." + question.type)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                ) : null}
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("edit-quiz.question-page.question.placeholder")}
                  className="w-full"
                />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <CardContent className="px-3 md:px-4 pb-3 md:pb-4 pt-2 md:pt-1">
                {children}
              </CardContent>
              <div className="flex justify-end px-3 md:px-4 pb-2.5 md:pb-3">
                <div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant={"outline"} onClick={() => deleteQuestion(question.uid)}>
                        <Trash2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("tooltip.delete")}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};
