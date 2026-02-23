import { Badge } from '@/components/ui/badge';
import AnswerRenderer from './AnswerRenderer';

export interface SubQuestionAnswerProps {
  subAnswer: any;
  subQuestion: any;
  questionTypeLabelByType: Map<string, string>;
}

const SubQuestionAnswer = ({
  subAnswer,
  subQuestion,
  questionTypeLabelByType,
  t,
  isNew,
  files = [],
}: SubQuestionAnswerProps & { t: (key: string) => string; isNew: boolean; files: [] }) => {
  const subQuestionUid = subAnswer?.question_uid;
  const subTitle = subQuestion?.content?.title || subQuestion?.title || null;
  const subTypeRaw = subQuestion?.type || 'unknown';
  const subTypeLabel = questionTypeLabelByType.get(subTypeRaw) || subTypeRaw;

  return (
    <div className="border-t pt-4 first:border-t-0 first:pt-0 space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {subTypeLabel}
        </Badge>
        {subQuestionUid && (
          <span className="text-[10px] lg:text-xs text-muted-foreground">{subQuestionUid}</span>
        )}
      </div>
      {subTitle && <div className="text-xs lg:text-sm font-medium">{subTitle}</div>}
      <div className={subTitle ? '' : 'pt-1'}>
        <AnswerRenderer
          isNew={isNew}
          answer={{ answer: subAnswer?.answer, files }}
          type={subTypeRaw}
          question={subQuestion}
          t={t}
        />
      </div>
    </div>
  );
};

export default SubQuestionAnswer;
