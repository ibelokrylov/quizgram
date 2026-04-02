import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Quiz, QuizQuestionSlide } from '@/entities/Quiz/quiz.type';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const SlideQuestion = ({
  question,
  setQuestion,
}: {
  question: Quiz['question'][0];
  setQuestion: (question: Quiz['question'][0]) => void;
}) => {
  const content = question?.content as QuizQuestionSlide;
  const { t } = useTranslation();

  useEffect(() => {
    if (!content) {
      setQuestion({
        ...question,
        content: {
          options: { start: 0, end: 100, default_select: 50, step: 1 },
        },
      });
    }
  }, [content]);

  return (
    <div className="flex flex-col gap-5">
      <div className={'flex items-center gap-2 justify-center'}>
        <div className={'flex flex-col gap-1 w-full'}>
          <Label htmlFor="start">{t('edit-quiz.question-page.question.slide.start')}</Label>
          <Input
            id="start"
            value={content?.options?.start}
            onChange={(e) =>
              setQuestion({
                ...question,
                content: {
                  ...content,
                  options: {
                    ...content.options,
                    start: Number(e.target.value),
                  },
                },
              })
            }
            type="number"
          />
        </div>
        <div className={'text-2xl font-bold text-center pt-2.5'}>-</div>
        <div className={'flex flex-col gap-1 w-full'}>
          <Label htmlFor="end">{t('edit-quiz.question-page.question.slide.end')}</Label>
          <Input
            id="end"
            value={content?.options?.end}
            type="number"
            onChange={(e) =>
              setQuestion({
                ...question,
                content: {
                  ...content,
                  options: { ...content.options, end: Number(e.target.value) },
                },
              })
            }
          />
        </div>
      </div>
      <div className={'flex flex-col gap-4'}>
        <div className={'flex flex-col gap-1'}>
          <Label htmlFor="default_select">
            {t('edit-quiz.question-page.question.slide.default_select')}
          </Label>
          <Input
            id="default_select"
            value={content?.options?.default_select}
            onChange={(e) =>
              setQuestion({
                ...question,
                content: {
                  ...content,
                  options: {
                    ...content.options,
                    default_select: Number(e.target.value),
                  },
                },
              })
            }
            type="number"
            placeholder="50"
          />
        </div>
        <div className={'flex flex-col gap-1'}>
          <Label htmlFor="default_select">{t('edit-quiz.question-page.question.slide.step')}</Label>
          <Input
            id="default_select"
            value={content?.options?.step}
            onChange={(e) =>
              setQuestion({
                ...question,
                content: {
                  ...content,
                  options: { ...content.options, step: Number(e.target.value) },
                },
              })
            }
            type="number"
            placeholder="1"
          />
        </div>
      </div>
    </div>
  );
};
