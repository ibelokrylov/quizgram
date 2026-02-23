import { Badge } from '@/components/ui/badge';
import SubQuestionAnswer from './SubQuestionAnswer';

export interface QuestionGroupCardProps {
  item: any;
  idx: number;
  questionFromQuiz: any;
  questionTypeLabelByType: Map<string, string>;
  title: string | null;
  typeLabel: string;
}

const QuestionGroupCard = ({
  item,
  idx,
  questionFromQuiz,
  questionTypeLabelByType,
  title,
  typeLabel,
  t,
  isNew,
}: QuestionGroupCardProps & { t: (key: string) => string; isNew: boolean }) => {
  const questionUid = item?.question_uid ?? item?.question?.uid ?? null;
  const subQuestions = questionFromQuiz?.content?.questions || [];

  return (
    <div key={questionUid ?? idx} className="relative rounded-md border bg-muted/30 p-3 space-y-4">
      <Badge variant="secondary" className="absolute -top-2.5 left-2.5">
        {typeLabel}
      </Badge>
      {questionUid && (
        <Badge variant="secondary" className="absolute -bottom-7 right-2.5">
          {questionUid}
        </Badge>
      )}
      {title && <div className="text-xs lg:text-sm font-medium pt-1">{title}</div>}
      <div className={title ? 'space-y-4' : 'pt-3 space-y-4'}>
        {item.answer.map((subAnswer: any, subIdx: number) => {
          const subQuestionUid = subAnswer?.question_uid;
          const subQuestion = subQuestions.find((sq: any) => sq?.uid === subQuestionUid);

          return (
            <SubQuestionAnswer
              key={subQuestionUid || subIdx}
              subAnswer={subAnswer}
              subQuestion={subQuestion}
              questionTypeLabelByType={questionTypeLabelByType}
              t={t}
              isNew={isNew}
              files={item.files as []}
            />
          );
        })}
      </div>
    </div>
  );
};
export default QuestionGroupCard;
