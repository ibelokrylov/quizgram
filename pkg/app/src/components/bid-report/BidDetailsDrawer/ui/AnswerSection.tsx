import QuestionGroupCard from '@/components/bid-report/BidDetailsDrawer/ui/QuestionGroupCard.tsx';
import RegularQuestionCard from '@/components/bid-report/BidDetailsDrawer/ui/RegularQuestionCard.tsx';

// Компонент для секции ответов на вопросы
interface AnswersSectionProps {
  data: {
    answer: { files: []; answer: any };
    final_question: boolean;
    key: string;
    question_uid: string;
    timestamp: string;
  }[];
  questions?:
    | {
        content: any;
        order: number;
        type: string;
        uid: string;
      }[]
    | null;
  questionTypeLabelByType: Map<string, string>;
}

export const AnswersSection = ({
  data,
  questions,
  questionTypeLabelByType,
  t,
  isNew,
}: AnswersSectionProps & { t: (key: string) => string; isNew: boolean }) => {
  // Если данных нет (null, undefined) или пустой массив - не показываем секцию
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-3 pt-4 border-t">
      <h3 className="font-semibold text-base lg:text-lg">{t('bids.details.answers')}</h3>
      <div className="space-y-6">
        {questions?.map((question: any, idx: number) => {
          const item = data.find((i) => i.question_uid === question.uid);
          if (!item) return null;

          const title = question?.content?.title || question?.title || null;

          const typeRaw = question?.type || 'unknown';
          const typeLabel = questionTypeLabelByType.get(typeRaw) || typeRaw;
          if (!isNew) {
            const isQuestionGroup = typeRaw === 'question_group';
            const answerIsArray = Array.isArray(item?.answer);

            if (isQuestionGroup && answerIsArray) {
              return (
                <QuestionGroupCard
                  key={question.uid ?? idx}
                  item={item}
                  idx={idx}
                  questionFromQuiz={question}
                  questionTypeLabelByType={questionTypeLabelByType}
                  title={title}
                  typeLabel={typeLabel}
                  t={t}
                  isNew={isNew}
                />
              );
            }
          } else {
            const isQuestionGroup = typeRaw === 'question_group';
            const answerIsArray = Array.isArray(item?.answer?.answer);
            if (isQuestionGroup && answerIsArray) {
              return (
                <QuestionGroupCard
                  key={question.uid ?? idx}
                  item={item.answer}
                  idx={idx}
                  questionFromQuiz={question}
                  questionTypeLabelByType={questionTypeLabelByType}
                  title={title}
                  typeLabel={typeLabel}
                  t={t}
                  isNew={isNew}
                />
              );
            }
          }

          return (
            <RegularQuestionCard
              key={question.uid ?? idx}
              item={item}
              idx={idx}
              title={title}
              typeRaw={typeRaw}
              typeLabel={typeLabel}
              question={question}
              t={t}
              isNew={isNew}
            />
          );
        })}
      </div>
    </div>
  );
};
