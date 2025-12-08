import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { QuizThxPage } from '@/entities/Quiz/quiz.type';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
  buttons: QuizThxPage['buttons'];
  setButtons: (buttons: QuizThxPage['buttons']) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};
export const ButtonsEditor = (props: Props) => {
  const { t } = useTranslation();
  const [buttons, setButtons] = useState<QuizThxPage['buttons']>(props.buttons?.length ? props.buttons : [{ title: '', link: '' }]);

  const changeButton = useCallback((idx: number, type: 'title' | 'link', value: string) => {
    setButtons((prev) => {
      if (type === 'title') {
        if (value.length > 60) {
          return prev;
        }
      }
      const newButtons = [...(prev ?? [])];
      newButtons[idx] = { ...newButtons[idx], [type]: value };
      return newButtons;
    });
  }, []);

  const addButton = useCallback(() => {
    setButtons((prev) => [...(prev ?? []), { title: '', link: '' }]);
  }, []);

  const isValidUrl = useCallback((url: string) => {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const validatedButtons = useMemo(() => {
    return buttons?.filter((button) => button.title && button.link && isValidUrl(button.link)) ?? [];
  }, [buttons, isValidUrl]);

  useEffect(() => {
    if (validatedButtons?.length) {
      props.setButtons(validatedButtons);
    } else {
      props.setButtons(undefined);
    }
  }, [validatedButtons]);

  return (
    <Drawer
      open={props.open}
      onOpenChange={props.setOpen}
    >
      <DrawerContent>
        <DrawerHeader>{t('edit-quiz.thx-page.button.title')}</DrawerHeader>
        <div className={'flex flex-col gap-6 w-full max-w-[414px] mx-auto pb-5 overflow-y-auto'}>
          {buttons?.map((button, idx) => {
            const buttonId = `button-${idx}`;
            const titleId = `${buttonId}-title`;
            const linkId = `${buttonId}-link`;
            return (
              <div
                key={buttonId}
                className={'flex flex-col gap-4'}
              >
                <div className={'flex flex-col gap-1'}>
                  <Label htmlFor={titleId}>{t('edit-quiz.thx-page.button.label')}</Label>
                  <Input
                    id={titleId}
                    value={button.title}
                    placeholder={t('edit-quiz.thx-page.button.label.placeholder')}
                    onChange={(e) => changeButton(idx, 'title', e.target.value)}
                  />
                </div>
                <div className={'flex flex-col gap-1'}>
                  <Label htmlFor={linkId}>{t('edit-quiz.thx-page.button.link')}</Label>
                  <Input
                    id={linkId}
                    value={button.link}
                    placeholder={t('edit-quiz.thx-page.button.link.placeholder')}
                    onChange={(e) => changeButton(idx, 'link', e.target.value)}
                  />
                </div>
                <Separator />
              </div>
            );
          })}
          <Button
            variant={'outline'}
            size={'icon-sm'}
            onClick={addButton}
          >
            <Plus />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
