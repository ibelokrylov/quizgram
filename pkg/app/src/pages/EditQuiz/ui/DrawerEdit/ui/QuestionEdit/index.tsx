import { DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import { DrawerEditContext } from '@/pages/EditQuiz/context/DrawerEdit.context';
import { t } from 'i18next';
import { useContext } from 'react';
import { Question } from './ui/Question';
import { CopyToClick } from '@/components/ui/copy-to-click';

export const QuestionEdit = () => {
  const ctx = useContext(DrawerEditContext);
  const { quiz } = useContext(CreateQuizContext);

  if (!ctx?.uid) return null;

  const question = quiz?.question?.find((q) => q.uid === ctx.uid);

  if (!question) return null;

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{t('edit-quiz.question.title')}</DrawerTitle>
        <DrawerDescription>
          <CopyToClick text={question?.uid}>
            <div className="text-xs text-gray-400 dark:text-gray-600">key: {ctx.uid}</div>
          </CopyToClick>
        </DrawerDescription>
      </DrawerHeader>
      <div>
        <Question question={question} />
      </div>
    </>
  );
};
