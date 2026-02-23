import { AppContext } from '@/app/context/app.context';
import { set } from '@/app/db/index-db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import type { Quiz } from '@/entities/Quiz/quiz.type';
import http from '@/lib/http';
import { useLocation } from '@tanstack/react-router';
import { format } from 'date-fns';
import { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CiSaveUp1 } from 'react-icons/ci';
import { toast } from 'sonner';
import { ContactsPage } from './ui/ContactsPage';
import { QuestionPage } from './ui/QuestionPage';
import { ResultPage } from './ui/ResultPage';
import { SettingsPage } from './ui/SettingsPage';
import { StartPage } from './ui/StartPage';
import { ThxPage } from './ui/ThxPage';

type QuizUpdateResponse = {
  ok: string[];
  errors: string[];
};

const renderStage = {
  start: <StartPage />,
  question: <QuestionPage />,
  contacts: <ContactsPage />,
  thx: <ThxPage />,
  result: <ResultPage />,
  settings: <SettingsPage />,
};

function isValidStageKey(key: string): key is keyof typeof renderStage {
  return key in renderStage;
}

export const EditQuiz = () => {
  const { quiz, setQuiz, isLoadToServer, setIsLoadToServer } = useContext(CreateQuizContext);
  const { t } = useTranslation();
  const location = useLocation();
  const { setHeaderContent } = useContext(AppContext);

  async function saveToServer() {
    if (isLoadToServer) {
      toast.error(t('toast.error.quiz-load'));
      return;
    }
    if (!quiz?.uid) {
      return;
    }
    try {
      const response = await http({
        url: '/v1/quiz/' + quiz?.uid,
        body: {
          startPage: quiz?.startPage,
          questionTitle: quiz?.questionTitle,
          question: quiz?.question,
          contact: quiz?.contact,
          thxPage: quiz?.thxPage,
        },
        method: 'PUT',
      });
      console.log(response);

      // Сервер возвращает { ok: string[], errors: string[] } напрямую
      // Функция http возвращает HttpResponse<T>, где T - это тип данных
      // TODO: Добавить Zod валидацию для response
      const result = (response.data || response) as unknown as QuizUpdateResponse;
      if (!result.errors || result.errors.length === 0) {
        await set(quiz.uid, { data: quiz, isLoadToServer: true });
        setIsLoadToServer(true);
      }
    } catch (err) {
      console.log(err);
      toast.error(t('toast.error.quiz-not-load'));
    }
  }

  useEffect(() => {
    if (isLoadToServer) {
      setHeaderContent(
        <div className={'text-xs text-gray-500 dark:text-gray-400'}>
          {t('edit-quiz.updated-at', {
            date: format(quiz?.updatedAt ?? new Date(), 'dd.MM.yyyy HH:mm:ss'),
          })}
        </div>,
      );
    } else {
      setHeaderContent(
        <Button
          onClick={saveToServer}
          color={'primary'}
          className='w-auto'
        >
          <CiSaveUp1 />
          {t('edit-quiz.publish')}
        </Button>,
      );
    }

    return () => {
      setHeaderContent(null);
    };
  }, [isLoadToServer]);

  const [name, setName] = useState(quiz?.name);

  const stage = location.hash || 'start';

  async function updateName() {
    if (!quiz?.uid || !name) {
      return;
    }
    if (quiz?.name === name) {
      return;
    }
    try {
      await http({
        url: `/v1/quiz/name/${quiz?.uid}`,
        method: 'PUT',
        body: { name },
      });
      if (quiz) {
        setQuiz({ ...quiz, name } as Quiz);
      }
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <div className='flex flex-col gap-4 max-w-[1000px] w-full'>
      <div className='px-4 lg:px-0 pt-3'>
        <Input
          key={quiz?.name}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onBlur={updateName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateName();
            }
          }}
          placeholder={t('edit-quiz.name.placeholder')}
        />
      </div>

      {/* <Separator /> */}
      {/* <div className={`grid grid-cols-2 lg:grid-cols-5 gap-2 pt-2 max-w-[1000px] w-full px-2 lg:px-0`}>
        {[...currentStages].map((st) => (
          <Card
            key={st}
            onClick={() => handleStageChange(st)}
            className={cn(
              st === stage
                ? 'bg-accent text-accent-foreground'
                : 'bg-secondary text-secondary-foreground dark:bg-background/80 dark:border-input/80 dark:text-foreground dark:hover:bg-accent/30',
              'cursor-pointer p-4 transition-all',
            )}
          >
            <div className='flex flex-row gap-2 items-center'>
              <div>{isValidIconKey(st) ? icons[st] : null}</div>
              <div>{t(`edit-quiz.stages.${st}`)}</div>
            </div>
          </Card>
        ))}
      </div> */}
      <Separator />
      <div key={quiz?.uid}>{isValidStageKey(stage) ? renderStage[stage] : null}</div>
    </div>
  );
};
