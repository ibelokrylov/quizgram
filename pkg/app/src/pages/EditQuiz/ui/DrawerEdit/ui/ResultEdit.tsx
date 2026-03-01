import { CopyToClick } from '@/components/ui/copy-to-click';
import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import { DrawerEditContext } from '@/pages/EditQuiz/context/DrawerEdit.context';
import { t } from 'i18next';
import { useContext, useId, useState } from 'react';

export const ResultEdit = () => {
  const ctx = useContext(DrawerEditContext);
  const { quiz } = useContext(CreateQuizContext);
  const id = useId();
  if (!ctx.uid) return null;

  const result = quiz?.results?.find((i) => i.uid === ctx.uid);
  if (!result) return null;

  const [title, setTitle] = useState(result.content?.title ?? '');

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{t('edit-quiz.start-page.title')}</DrawerTitle>
        <DrawerDescription>
          <CopyToClick as={'span'} text={ctx.uid}>
            key: {ctx.uid}
          </CopyToClick>
        </DrawerDescription>
      </DrawerHeader>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label htmlFor={id}>{t('quiz-edit.result.title.label')}</Label>
          <Input id={id} />
        </div>
      </div>
    </>
  );
};
