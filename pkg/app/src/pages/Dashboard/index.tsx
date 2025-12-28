import { Button } from "@/components/ui/button";
import type { QuizDashboard } from "@/entities/Quiz/quiz.type";
import { useDashboard } from "@/entities/Quiz/useDashboard";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DashboardQuiz } from "./ui/DashboardQuiz";

export const DashboardPage = () => {
  const [queryParams, setQueryParams] = useState<{
    limit: number;
    page: number;
  }>({ limit: 10, page: 1 });
  const { query } = useDashboard(queryParams);
  const { t } = useTranslation();

  const [quizzes, setQuizzes] = useState<QuizDashboard[]>([]);

  function addQuizzes(newQuizzes: QuizDashboard[]) {
    setQuizzes((prev) => [...prev, ...newQuizzes]);
  }

  function deleteQuiz(uid: string) {
    const newQ = [...quizzes]?.filter((q) => q.uid !== uid);
    setQuizzes(newQ);
  }

  useEffect(() => {
    if (query?.data) {
      if (queryParams.page === 1) {
        setQuizzes(query.data.quizzes);
      } else {
        addQuizzes(query.data.quizzes);
      }
    }
  }, [query?.data, queryParams.page]);

  // Показываем сообщение о пустом состоянии только если данные загружены и квизов нет
  const isEmpty = !query.isLoading && !query.isFetching && quizzes.length === 0;

  return (
    <div className="flex flex-col gap-5 p-1 md:p-2">
      {isEmpty ? (
        <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-lg">{t("quiz.dashboard.empty")}</p>
        </div>
      ) : (
        <>
          <div className={"mt-2 grid grid-cols-1 md:grid-cols-2 gap-2"}>
            {quizzes?.map((quiz) => (
              <DashboardQuiz onDeleteQuiz={() => deleteQuiz(quiz.uid)} key={quiz.uid} quiz={quiz} />
            ))}
          </div>
          {(query?.data?.count ?? 0) > 0 && quizzes?.length !== query?.data?.count ? (
            <div>
              <Button
                variant={"outline"}
                onClick={() => setQueryParams({ ...queryParams, page: queryParams.page + 1 })}
              >
                {t("quiz.load-more")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
