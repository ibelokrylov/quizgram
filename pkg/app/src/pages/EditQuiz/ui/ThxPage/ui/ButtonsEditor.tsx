import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { QuizThxPage } from '@/entities/Quiz/quiz.type';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  buttons: QuizThxPage['buttons'];
  setButtons: (buttons: QuizThxPage['buttons']) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};
export const ButtonsEditor = (props: Props) => {
  const { t } = useTranslation();
  const buttons = props.buttons?.length ? props.buttons : [{ title: '', link: '' }];

  function onChangeButton(idx: number, value: { title: string; link: string }) {
    props.setButtons(
      buttons.map((item, i) => {
        if (i === idx) {
          return value;
        }
        return item;
      })
    );
  }

  function addButton() {
    props.setButtons([...buttons, { title: '', link: '' }]);
  }

  return (
    <Drawer open={props.open} onOpenChange={props.setOpen}>
      <DrawerContent>
        <DrawerHeader>{t('edit-quiz.thx-page.button.title')}</DrawerHeader>
        <div className={'flex flex-col gap-6 w-full max-w-[414px] mx-auto pb-5 overflow-y-auto'}>
          {buttons?.map((button, idx) => {
            const buttonId = `button-${idx}`;
            const titleId = `${buttonId}-title`;
            const linkId = `${buttonId}-link`;
            return (
              <div key={buttonId} className={'flex flex-col gap-4'}>
                <div className={'flex flex-col gap-1'}>
                  <Label htmlFor={titleId}>{t('edit-quiz.thx-page.button.label')}</Label>
                  <Input
                    id={titleId}
                    value={button.title}
                    placeholder={t('edit-quiz.thx-page.button.label.placeholder')}
                    onChange={(e) => onChangeButton(idx, { ...button, title: e.target.value })}
                  />
                </div>
                <div className={'flex flex-col gap-1'}>
                  <Label htmlFor={linkId}>{t('edit-quiz.thx-page.button.link')}</Label>
                  <Input
                    id={linkId}
                    value={button.link}
                    placeholder={t('edit-quiz.thx-page.button.link.placeholder')}
                    onChange={(e) => onChangeButton(idx, { ...button, link: e.target.value })}
                  />
                </div>
                <Separator />
              </div>
            );
          })}
          <Button variant={'outline'} size={'icon-sm'} onClick={addButton}>
            <Plus />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
