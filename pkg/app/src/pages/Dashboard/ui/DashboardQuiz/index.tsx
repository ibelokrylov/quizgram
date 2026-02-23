import { remove } from '@/app/db/index-db';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InputNoBorder } from '@/components/ui/input-no-border';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { QuizDashboard } from '@/entities/Quiz/quiz.type';
import http from '@/lib/http';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaPencil, FaTrash } from 'react-icons/fa6';
import { ImSwitch } from 'react-icons/im';
import { IoCopySharp, IoNotificationsOutline } from 'react-icons/io5';
import { toast } from 'sonner';

export const DashboardQuiz = ({
  quiz,
  onDeleteQuiz,
}: {
  quiz: QuizDashboard;
  onDeleteQuiz: () => void;
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(quiz?.name);
  const [active, setActive] = useState(quiz?.isActive ?? false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('toast.copy.success'));
    } catch (err) {
      console.log(err);
    }
  }

  async function updateName() {
    if (!quiz?.uid) {
      return;
    }
    if (quiz?.name === title) {
      return;
    }
    try {
      await http({
        url: `/v1/quiz/name/${quiz?.uid}`,
        method: 'PUT',
        body: { name: title },
      });
    } catch (err) {
      console.log(err);
    }
  }

  async function toggleActive() {
    try {
      await http({ url: `/v1/quiz/active/${quiz?.uid}`, method: 'POST' });
      toast.success(t('edit-quiz.active.success'));
      setActive(!active);
    } catch (err) {
      console.log(err);
    }
  }

  async function deleteQuiz() {
    try {
      await http({ url: `/v1/quiz/` + quiz?.uid, method: 'DELETE' });
      await remove(quiz?.uid);
      onDeleteQuiz();
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <Card className="p-2" key={quiz.uid}>
      <div className={'flex flex-col gap-3'}>
        <div>
          <Button
            className="hover:text-blue-400"
            variant={'link'}
            onClick={() => copy(import.meta.env.VITE_PUBLIC_QUIZ_URL + quiz.uid)}
          >
            <IoCopySharp size={28} />
            <div className="truncate w-48">
              {import.meta.env.VITE_PUBLIC_QUIZ_URL?.replace('https://', '')}
              {quiz.uid}
            </div>
          </Button>
        </div>
        <div>
          <InputNoBorder
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={updateName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                updateName();
              }
            }}
          />
        </div>
        <Separator />
        <div className="grid grid-cols-4 gap-4 items-start">
          <Tooltip>
            <TooltipTrigger>
              <div className="flex flex-col text-left">
                <div className="text-xl font-bold">{quiz.opened}</div>
                <div className="text-xs text-muted-foreground">{t('quiz.dashboard.opened')}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('quiz.dashboard.opened.tooltip')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex flex-col text-left">
                <div className="text-xl font-bold">{quiz.openedUnique}</div>
                <div className="text-xs text-muted-foreground">
                  {t('quiz.dashboard.openedUnique')}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('quiz.dashboard.openedUnique.tooltip')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <div className="flex flex-col text-left">
                <div className="text-xl font-bold">{quiz.full}</div>
                <div className="text-xs text-muted-foreground">{t('quiz.dashboard.full')}</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('quiz.dashboard.full.tooltip')}</p>
            </TooltipContent>
          </Tooltip>
          {quiz.opened && quiz.full ? (
            <Tooltip>
              <TooltipTrigger>
                <div className="flex flex-col text-left">
                  <div className="text-xl font-bold">
                    {((quiz.full / quiz.opened) * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('quiz.dashboard.conversion')}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('quiz.dashboard.conversion.tooltip')}</p>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-3">
            <div>
              <Link to={'/app/quiz/' + quiz.uid}>
                <Button variant={'secondary'}>
                  <FaPencil />
                  {t('quiz.dashboard.edit')}
                </Button>
              </Link>
            </div>
            <div>
              <Link
                to="/app/bid/report"
                search={{
                  limit: 10,
                  quiz_uid: quiz.uid,
                }}
              >
                <Button variant={'secondary'}>{t('quiz.dashboard.bid')}</Button>
              </Link>
            </div>
            <div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to="/app/notification">
                    <Button variant={'secondary'} size={'icon'}>
                      <IoNotificationsOutline />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('nav.user.notifications')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className={'flex items-center gap-2'}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  defaultPressed={active}
                  aria-label="Toggle bookmark"
                  variant={active ? 'default' : 'outline'}
                  onClick={toggleActive}
                >
                  <ImSwitch className="group-data-[state=on]/toggle:color-red" />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                <p> {active ? t('quiz.dashboard.deactivate') : t('quiz.dashboard.activate')}</p>
              </TooltipContent>
            </Tooltip>
            <AlertDialog open={alertDialogOpen}>
              <AlertDialogTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={() => setAlertDialogOpen(true)} variant={'ghost'}>
                      <FaTrash />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('quiz.dashboard.delete')}</p>
                  </TooltipContent>
                </Tooltip>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('quiz.dashboard.delete.title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('quiz.dashboard.delete.description')}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setAlertDialogOpen(false)}>
                    {t('quiz.dashboard.delete.cancel')}
                  </AlertDialogCancel>
                  <AlertDialogAction variant={'destructive'} onClick={deleteQuiz}>
                    {t('quiz.dashboard.delete.yes')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );
};
