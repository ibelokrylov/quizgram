import { set } from '@/app/db/index-db';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import type { Quiz } from '@/entities/Quiz/quiz.type';
import { hasAccessToPaidContent } from '@/entities/User/access-control';
import { AuthContext } from '@/entities/User/auth.context';
import http from '@/lib/http';
import { cn } from '@/lib/utils';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { Copy, GalleryVerticalEnd, LaptopMinimalCheck, List, PanelTop, UserSearch } from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CiSaveUp1 } from 'react-icons/ci';
import { toast } from 'sonner';
import { ContactsPage } from './ui/ContactsPage';
import { QuestionPage } from './ui/QuestionPage';
import { ResultPage } from './ui/ResultPage';
import { StartPage } from './ui/StartPage';
import { ThxPage } from './ui/ThxPage';

const currentStages = new Set(['start', 'question', 'contacts', 'thx']);

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

type QuizUpdateResponse = {
  ok: string[];
  errors: string[];
};

// Type guards для безопасного доступа к объектам по ключам
function isValidIconKey(key: string): key is keyof typeof icons {
  return key in icons;
}

function isValidStageKey(key: string): key is keyof typeof renderStage {
  return key in renderStage;
}

export const EditQuiz = () => {
  const { user } = useContext(AuthContext);
  const { quiz, isLoadToServer, setQuiz, setIsLoadToServer } = useContext(CreateQuizContext);
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [name, setName] = useState(quiz?.name);
  const [active, setActive] = useState(quiz?.isActive);
  const [isShowLogo, setIsShowLogo] = useState(quiz?.isShowLogo ?? true);
  const [isMobile, setIsMobile] = useState(false);
  const [sharedQuiz, setSharedQuiz] = useState(quiz?.isShared ?? false);

  const isAccessPaidContent = useMemo(() => hasAccessToPaidContent(user), [user]);

  const [stage, setStage] = useState<string>(currentStages?.has(location.hash) ? location.hash : 'start');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (quiz?.isShowLogo !== undefined) {
      setIsShowLogo(quiz.isShowLogo);
    }
  }, [quiz?.isShowLogo]);

  function handleStageChange(stage: string) {
    if (currentStages?.has(stage)) {
      setStage(stage);
      navigate({ hash: stage });
    }
  }

  async function toggleActive() {
    try {
      await http({ url: `/v1/quiz/active/${quiz?.uid}`, method: 'POST' });
      toast.success(t('edit-quiz.active.success'));
      setActive(!active);
      if (quiz) {
        setQuiz({ ...quiz, isActive: !active } as Quiz);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function onSharedQuizSwitch() {
    if (!isAccessPaidContent) {
      toast.error(t('edit-quiz.public.error'));
      return;
    }
    try {
      await http({ url: '/v1/quiz/is-shared/' + quiz?.uid, method: 'PUT', body: { isShared: !sharedQuiz } });
      toast.success(t('edit-quiz.public.toast.success'));
      setSharedQuiz(!sharedQuiz);
      if (quiz) {
        setQuiz({ ...quiz, isShared: !sharedQuiz });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleIsShowLogo() {
    if (!isAccessPaidContent) {
      toast.error(t('edit-quiz.is-show-logo.error'));
      return;
    }
    try {
      await http({
        url: `/v1/quiz/is-show-logo/${quiz?.uid}`,
        method: 'PUT',
        body: { isShowLogo: !isShowLogo },
      });
      toast.success(t('edit-quiz.is-show-logo.success'));
      setIsShowLogo(!isShowLogo);
      if (quiz) {
        setQuiz({ ...quiz, isShowLogo: !isShowLogo });
      }
    } catch (err) {
      console.log(err);
    }
  }

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

  async function copySharedQuizUrl() {
    try {
      console.log(window.location);
      await navigator.clipboard.writeText(window.location.origin + '/app/import/' + quiz?.uid);
      toast.success(t('toast.copy.success'));
    } catch (err) {
      console.error(err);
      toast.error(t('toast.copy.error'));
    }
  }

  return (
    <div className='flex flex-col gap-4 max-w-[1000px] w-full'>
      <div className='px-4 lg:px-0 pt-3'>
        {isMobile ? (
          <Textarea
            key={quiz?.name}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            onBlur={updateName}
            className='min-h-[60px]'
            placeholder={t('edit-quiz.name.placeholder')}
          />
        ) : (
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
        )}
      </div>
      <div className='flex flex-col lg:flex-row gap-3 lg:gap-5 px-4 lg:px-0 lg:items-center'>
        <div className='flex flex-col lg:flex-row gap-3 lg:gap-5 items-start lg:items-center justify-between lg:justify-start pt-2 pb-2 lg:pt-0 lg:pb-0'>
          <div className='flex flex-row gap-3 lg:gap-5 items-center'>
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
            <div className='hidden lg:block'>
              <Separator orientation='vertical' />
            </div>
            <div
              onClick={toggleIsShowLogo}
              className={'hidden lg:flex flex-row gap-2 items-center cursor-pointer'}
            >
              <Switch
                id={'is-show-logo-switch'}
                checked={isShowLogo}
              />
              <Label htmlFor={'is-show-logo-switch'}>{t('edit-quiz.is-show-logo.label')}</Label>
            </div>
            <div className='hidden lg:block'>
              <Separator orientation='vertical' />
            </div>
          </div>
          <div className={'flex gap-4'}>
            <div
              onClick={onSharedQuizSwitch}
              className={'flex gap-2 items-center'}
            >
              <Switch
                id={'is-shared'}
                checked={sharedQuiz}
              />
              <Label htmlFor={'is-shared'}>{t('edit-quiz.public.label')}</Label>
            </div>
            {quiz?.isShared ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={'link'}
                    onClick={copySharedQuizUrl}
                  >
                    <Copy />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('edit-quiz.public.button.tooltip')}</p>
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          <div className='flex items-center w-full lg:w-auto pt-2 lg:pt-0'>
            {!isLoadToServer ? (
              <Button
                onClick={saveToServer}
                color={'primary'}
                className='w-full lg:w-auto'
              >
                <CiSaveUp1 />
                {t('edit-quiz.publish')}
              </Button>
            ) : (
              <div className={'text-xs text-gray-500 dark:text-gray-400'}>
                {t('edit-quiz.updated-at', {
                  date: format(quiz?.updatedAt ?? new Date(), 'dd.MM.yyyy HH:mm:ss'),
                })}
              </div>
            )}
          </div>
        </div>
        <div
          onClick={toggleIsShowLogo}
          className={'flex lg:hidden flex-row gap-2 items-center cursor-pointer pt-2 pb-2'}
        >
          <Switch
            id={'is-show-logo-switch'}
            checked={isShowLogo}
          />
          <Label htmlFor={'is-show-logo-switch'}>{t('edit-quiz.is-show-logo.label')}</Label>
        </div>
      </div>
      <Separator />
      <div className={`grid grid-cols-2 lg:grid-cols-5 gap-2 pt-2 max-w-[1000px] w-full px-2 lg:px-0`}>
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
      </div>
      <Separator />
      <div key={quiz?.uid}>{isValidStageKey(stage) ? renderStage[stage] : null}</div>
    </div>
  );
};
