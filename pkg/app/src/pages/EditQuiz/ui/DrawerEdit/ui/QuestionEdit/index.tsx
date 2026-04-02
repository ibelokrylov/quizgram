import { Badge } from '@/components/ui/badge';
import { CopyToClick } from '@/components/ui/copy-to-click';
import { DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import type { Quiz } from '@/entities/Quiz/quiz.type';
import { DrawerEditContext } from '@/pages/EditQuiz/context/DrawerEdit.context';
import { t } from 'i18next';
import { useContext, useState } from 'react';
import { Question } from './ui/Question';

export const QuestionEdit = () => {
  const ctx = useContext(DrawerEditContext);
  const { quiz, setQuiz } = useContext(CreateQuizContext);
  const question = quiz?.question?.find((q) => q.uid === ctx.uid);

  const updateQuestion = (question: Quiz['question'][0]) => {
    const next = (quiz?.question ?? []).map((q) => (q.uid === question.uid ? question : q));
    setQuiz({ ...quiz, question: next } as Quiz);
  };

  const [title, setTitle] = useState(question?.content?.title ?? '');
  if (!ctx?.uid || !question) return null;

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>
          <div className="flex gap-2 items-center justify-center">
            {question.type ? <Badge>{t(`question_types.${question.type}`)}</Badge> : null}
            <CopyToClick text={question?.uid}>
              <div className="text-xs text-gray-400 dark:text-gray-600">key: {ctx.uid}</div>
            </CopyToClick>
          </div>
        </DrawerTitle>
      </DrawerHeader>
      <div className="no-scrollbar overflow-y-auto px-4 h-[82vh]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 w-full">
            <Label htmlFor="title">{t('edit-quiz.question.page.title')}</Label>
            <Input
              placeholder={t('edit-quiz.question-page.title.placeholder')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={(e) =>
                updateQuestion({
                  ...question,
                  content: { ...question.content, title: e.target.value },
                })
              }
            />
          </div>
          <Separator />
          <Question question={question} />
        </div>
      </div>
    </>
  );
};
