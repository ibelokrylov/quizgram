import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InputNoBorder } from '@/components/ui/input-no-border';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import type { Quiz } from '@/entities/Quiz/quiz.type';
import { AuthContext } from '@/entities/User/auth.context';
import http from '@/lib/http';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { GalleryVerticalEnd, LaptopMinimalCheck, List, PanelTop, UserSearch } from 'lucide-react';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CiSaveUp1 } from 'react-icons/ci';
import { toast } from 'sonner';
import { ContactsPage } from './ui/ContactsPage';
import { QuestionPage } from './ui/QuestionPage';
import { ResultPage } from './ui/ResultPage';
import { StartPage } from './ui/StartPage';
import { ThxPage } from './ui/ThxPage';

const planStages = {
  1: new Set(['start', 'question', 'contacts', 'thx']),
  2: new Set(['start', 'question', 'result', 'contacts', 'thx']),
};

const icons = {
  start: <PanelTop />,
  question: <List />,
  contacts: <UserSearch />,
  thx: <LaptopMinimalCheck />,
  result: <GalleryVerticalEnd />,
};

const renderStage = {
  start: <StartPage />,
  question: <QuestionPage />,
  contacts: <ContactsPage />,
  thx: <ThxPage />,
  result: <ResultPage />,
};

export const EditQuiz = () => {
  const { user } = useContext(AuthContext);
  const { quiz, isLoadToServer, setQuiz } = useContext(CreateQuizContext);
  const { t } = useTranslation();
  const currentStages = planStages[(user?.planId as keyof typeof planStages) ?? 1];
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState(quiz?.name);
  const [active, setActive] = useState(quiz?.isActive);

  const [stage, setStage] = useState<string>(currentStages.has(location.hash) ? location.hash : 'start');
  function handleStageChange(stage: string) {
    if (currentStages.has(stage)) {
      setStage(stage);
      navigate({ hash: stage });
    }
  }

  async function toggleActive() {
    try {
      await http({ url: `/v1/quiz/active/${quiz?.uid}`, method: 'POST' });
      toast.success(t('edit-quiz.active.success'));
      setActive(!active);
      setQuiz({ ...quiz, isActive: !active } as Quiz);
    } catch (err) {
      console.log(err);
    }
  }

  async function updateName() {
    if (!quiz?.uid) {
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
      setQuiz({ ...quiz, name } as Quiz);
    } catch (err) {
      console.log(err);
    }
  }

  async function saveToServer() {
    if (isLoadToServer) {
      toast.error(t('toast.error.quiz-load'));
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
    } catch (err) {
      console.log(err);
      toast.error(t('toast.error.quiz-not-load'));
    }
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-row gap-5 pt-3'>
        <InputNoBorder
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
        />
        <div>
          <Separator orientation='vertical' />
        </div>
        <div
          onClick={toggleActive}
          className={'flex flex-row gap-2 items-center cursor-pointer'}
        >
          <Switch
            id={'active-switch'}
            checked={active}
          />
          <Label htmlFor={'active-switch'}>{t(`edit-quiz.active.${active?.toString() ?? 'false'}`)}</Label>
        </div>
        <div>
          <Separator orientation='vertical' />
        </div>
        <div>
          {!isLoadToServer ? (
            <Button
              onClick={saveToServer}
              color={'primary'}
            >
              <CiSaveUp1 />
              {t('edit-quiz.publish')}
            </Button>
          ) : (
            <div className={'text-xs text-gray-500 dark:text-gray-400 pt-3'}>
              {t('edit-quiz.updated-at', {
                date: format(quiz?.updatedAt ?? new Date(), 'dd.MM.yyyy HH:mm:ss'),
              })}
            </div>
          )}
        </div>
      </div>
      <Separator />
      <div className={`grid grid-cols-2 lg:grid-cols-5 gap-2 pt-2 max-w-[1000px] w-full px-2 lg:px-0`}>
        {[...currentStages].map((st) => (
          <Card
            key={st}
            onClick={() => handleStageChange(st)}
            className={cn(st === stage ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground', 'cursor-pointer p-4')}
          >
            <div className='flex flex-row gap-2 items-center'>
              <div>{icons[st as keyof typeof icons]}</div>
              <div>{t(`edit-quiz.stages.${st}`)}</div>
            </div>
          </Card>
        ))}
      </div>
      <Separator />
      <div key={quiz?.uid}>{renderStage[stage as keyof typeof renderStage]}</div>
    </div>
  );
};
