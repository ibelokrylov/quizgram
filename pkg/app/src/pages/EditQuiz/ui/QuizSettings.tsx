import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { t } from 'i18next';
import { Settings } from 'lucide-react';
import { SettingsPage } from './SettingsPage';

export const QuizSettings = () => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant={'ghost'} size={'sm'}>
          <Settings />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('quiz.settings.title')}</SheetTitle>
        </SheetHeader>
        <SettingsPage />
      </SheetContent>
    </Sheet>
  );
};
