import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Quiz, QuizQuestionSelect } from '@/entities/Quiz/quiz.type';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const SelectQuestion = ({ question, setQuestion }: { question: Quiz['question'][0]; setQuestion: (question: Quiz['question'][0]) => void }) => {
  const content = question?.content as QuizQuestionSelect;
  const { t } = useTranslation();

  useEffect(() => {
    if (!content?.variants?.length) {
      setQuestion({ ...question, content: { ...content, variants: [''] } });
    }
  }, [content]);

  return (
    <div className={'flex flex-col gap-3'}>
      {content?.variants?.map((variant, idx) => (
        <Input
          key={`${question.uid}-${idx}`}
          value={variant}
          placeholder={t('edit-quiz.question-page.question.select.placeholder')}
          onChange={(e) => setQuestion({ ...question, content: { ...content, variants: content.variants.map((v, i) => (i === idx ? e.target.value : v)) } })}
        />
      ))}
      <div>
        <Button
          variant={'outline'}
          size={'icon-sm'}
          onClick={() => setQuestion({ ...question, content: { ...content, variants: [...content.variants, ''] } })}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
};
