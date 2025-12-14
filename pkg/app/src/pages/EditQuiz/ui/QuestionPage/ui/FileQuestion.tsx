import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Quiz, QuizQuestionFile } from '@/entities/Quiz/quiz.type';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const FileQuestion = ({ question, setQuestion }: { question: Quiz['question'][0]; setQuestion: (question: Quiz['question'][0]) => void }) => {
  const content = question?.content as QuizQuestionFile;
  const { t } = useTranslation();

  useEffect(() => {
    if (!content.type && !content.title) {
      setQuestion({ ...question, content: { type: 'image', title: 'Заголовок вопроса' } });
    }
  }, [content]);

  return (
    <div className='flex flex-col gap-3'>
      <Label>{t('edit-quiz.question-page.question.file.title')}</Label>
      <Select
        value={content?.type}
        defaultValue='image'
        onValueChange={(value) => setQuestion({ ...question, content: { ...content, type: value as QuizQuestionFile['type'] } })}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('edit-quiz.question-page.question.file.type')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{t('edit-quiz.question-page.question.file.type')}</SelectLabel>
            <SelectItem value='all'>{t('edit-quiz.question-page.question.file.type.all')}</SelectItem>
            <SelectItem value='image'>{t('edit-quiz.question-page.question.file.type.image')}</SelectItem>
            <SelectItem value='video'>{t('edit-quiz.question-page.question.file.type.video')}</SelectItem>
            <SelectItem value='docs'>{t('edit-quiz.question-page.question.file.type.docs')}</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
