import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Quiz, QuizQuestionDate } from '@/entities/Quiz/quiz.type';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const DateQuestion = ({ question, setQuestion }: { question: Quiz['question'][0]; setQuestion: (question: Quiz['question'][0]) => void }) => {
  const content = question?.content as QuizQuestionDate;
  const { t } = useTranslation();

  useEffect(() => {
    if (!content?.type) {
      setQuestion({ ...question, content: { ...content, type: 'calendar' } });
    }
  }, [content]);

  return (
    <Tabs
      defaultValue='calendar'
      className='w-[400px]'
    >
      <TabsList>
        <TabsTrigger value='calendar'>{t('edit-quiz.question-page.question.date.calendar')}</TabsTrigger>
        <TabsTrigger value='mask'>{t('edit-quiz.question-page.question.date.mask')}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
