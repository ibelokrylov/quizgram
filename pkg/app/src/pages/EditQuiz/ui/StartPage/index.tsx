import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateQuizContext } from "@/entities/Quiz/CreateQuiz.context";
import type { Quiz } from "@/entities/Quiz/quiz.type";
import { BadgePlus } from "lucide-react";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Site } from "./ui/Site";
import { Standard } from "./ui/Standard";

const renderStartPage = {
  standard: <Standard />,
  site: <Site />,
};

export const StartPage = () => {
  const { quiz, setQuiz } = useContext(CreateQuizContext);
  const { t } = useTranslation();

  if (quiz?.startPage) {
    return renderStartPage[quiz.startPage.type];
  }

  async function createStartPage(type: "standard" | "site") {
    try {
      const newQuiz = {
        ...quiz,
        startPage: {
          type: type,
          content: {
            title: "Заголовок страницы",
          },
        },
      } as Quiz;
      setQuiz(newQuiz);
    } catch (err) {
      console.log(err);
      toast.error(t("edit-quiz.start-page.failed-to-create"));
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-0.5">
      <Card className="p-4 col-span-1">
        <div className="flex flex-row gap-2 items-center justify-between">
          <h2>{t("edit-quiz.start-page.standard.title")}</h2>
          <Button variant="outline" onClick={() => createStartPage("standard")}>
            {t("edit-quiz.start-page.standard.create")} <BadgePlus />
          </Button>
        </div>
        <p>{t("edit-quiz.start-page.standard.description")}</p>
      </Card>
      {/* <Card className='p-4'>
        <div className='flex flex-row gap-2 items-center justify-between'>
          <h2>{t('edit-quiz.start-page.site.title')}</h2>
          <Button
            variant='outline'
            onClick={() => createStartPage('site')}
          >
            {t('edit-quiz.start-page.site.create')} <BadgePlus />
          </Button>
        </div>
        <p>{t('edit-quiz.start-page.site.description')}</p>
      </Card> */}
    </div>
  );
};
