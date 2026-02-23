import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import type { Quiz } from '@/entities/Quiz/quiz.type';
import { hasAccessToPaidContent } from '@/entities/User/access-control';
import { AuthContext } from '@/entities/User/auth.context';
import http from '@/lib/http';
import { Copy } from 'lucide-react';
import { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { user } = useContext(AuthContext);
  const { quiz, setQuiz } = useContext(CreateQuizContext);
  const isAccessPaidContent = useMemo(() => hasAccessToPaidContent(user), [user]);

  const { t } = useTranslation();

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

  async function toggleIsShowLogo() {
    if (!isAccessPaidContent) {
      toast.error(t('edit-quiz.is-show-logo.error'));
      return;
    }
    try {
      await http({
        url: `/v1/quiz/is-show-logo/${quiz?.uid}`,
        method: 'PUT',
        body: { isShowLogo: !quiz?.isShowLogo },
      });
      toast.success(t('edit-quiz.is-show-logo.success'));
      if (quiz) {
        setQuiz({ ...quiz, isShowLogo: !quiz?.isShowLogo });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function toggleActive(value: boolean) {
    try {
      await http({ url: `/v1/quiz/active/${quiz?.uid}`, method: 'POST' });
      toast.success(t('edit-quiz.active.success'));
      if (quiz) {
        setQuiz({ ...quiz, isActive: value } as Quiz);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function onSharedQuizSwitch(value: boolean) {
    if (!isAccessPaidContent) {
      toast.error(t('edit-quiz.public.error'));
      return;
    }
    try {
      await http({ url: '/v1/quiz/is-shared/' + quiz?.uid, method: 'PUT', body: { isShared: value } });
      toast.success(t('edit-quiz.public.toast.success'));
      if (quiz) {
        setQuiz({ ...quiz, isShared: value });
      }
    } catch (err) {
      console.error(err);
    }
  }
  return (
    <div className='flex flex-col lg:flex-row gap-3 lg:gap-5 px-4 lg:px-0 lg:items-center'>
      <div className='flex flex-col lg:flex-row gap-3 lg:gap-5 items-start lg:items-center justify-between lg:justify-start pt-2 pb-2 lg:pt-0 lg:pb-0'>
        <div className='flex flex-row gap-3 lg:gap-5 items-center'>
          <div
            onClick={() => toggleActive(!quiz?.isActive)}
            className={'flex flex-row gap-2 items-center cursor-pointer'}
          >
            <Switch
              id={'active-switch'}
              checked={quiz?.isActive}
            />
            <Label htmlFor={'active-switch'}>{t(`edit-quiz.active.${quiz?.isActive?.toString() ?? 'false'}`)}</Label>
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
              checked={quiz?.isShowLogo ?? true}
            />
            <Label htmlFor={'is-show-logo-switch'}>{t('edit-quiz.is-show-logo.label')}</Label>
          </div>
          <div className='hidden lg:block'>
            <Separator orientation='vertical' />
          </div>
        </div>
        <div className={'flex gap-4'}>
          <div
            onClick={() => onSharedQuizSwitch(!quiz?.isShared)}
            className={'flex gap-2 items-center'}
          >
            <Switch
              id={'is-shared'}
              checked={quiz?.isShared ?? false}
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
      </div>
      <div
        onClick={toggleIsShowLogo}
        className={'flex lg:hidden flex-row gap-2 items-center cursor-pointer pt-2 pb-2'}
      >
        <Switch
          id={'is-show-logo-switch'}
          checked={quiz?.isShowLogo ?? true}
        />
        <Label htmlFor={'is-show-logo-switch'}>{t('edit-quiz.is-show-logo.label')}</Label>
      </div>
    </div>
  );
};
