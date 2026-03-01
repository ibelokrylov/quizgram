import { Drawer, DrawerClose, DrawerContent, DrawerFooter } from '@/components/ui/drawer';
import { useContext, type ReactNode } from 'react';
import { DrawerEditContext, type DrawerContextType } from '../../context/DrawerEdit.context';
import { StartPageDrawerContent } from './ui/StartPageDrawerContent';
import { QuestionEdit } from './ui/QuestionEdit';
import { t } from 'i18next';
import { ResultEdit } from './ui/ResultEdit';

const render: Record<DrawerContextType, ReactNode> = {
  startPage: <StartPageDrawerContent />,
  contact: <>Contact</>,
  thxPage: <>Thx edit</>,
  resaults: <ResultEdit />,
  question: <QuestionEdit />,
};

export const DrawerEdit = () => {
  const ctx = useContext(DrawerEditContext);
  if (!ctx?.type) return null;

  return (
    <Drawer onClose={() => ctx.setOpen(false)} open={ctx.open}>
      <DrawerContent>
        <div className="max-w-[800px] mx-auto my-0">{render[ctx.type]}</div>
        <DrawerFooter>
          <DrawerClose>{t('edit-quiz.start-page.close')}</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
