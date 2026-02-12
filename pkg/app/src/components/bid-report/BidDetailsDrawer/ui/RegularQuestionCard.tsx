import { Badge } from "@/components/ui/badge";
import AnswerRenderer from "./AnswerRenderer";

export interface RegularQuestionCardProps {
  item: any;
  idx: number;
  title: string | null;
  typeRaw: string;
  typeLabel: string;
  question?: any;
}

const RegularQuestionCard = ({
  item,
  idx,
  title,
  typeRaw,
  typeLabel,
  question,
  t,
  isNew,
}: RegularQuestionCardProps & {
  t: (key: string) => string;
  isNew: boolean;
}) => {
  const questionUid = item?.question_uid ?? item?.question?.uid ?? null;

  return (
    <div
      key={questionUid ?? idx}
      className="relative rounded-md border bg-muted/30 p-3 space-y-2 pb-7"
    >
      <Badge variant="secondary" className="absolute -top-2.5 left-2.5">
        {typeLabel}
      </Badge>
      {questionUid && (
        <Badge variant="secondary" className="absolute -bottom-5 right-2.5">
          {questionUid}
        </Badge>
      )}
      {title && (
        <div className="text-xs lg:text-sm font-medium pt-1">{title}</div>
      )}
      <div className={title ? "" : "pt-3"}>
        <AnswerRenderer
          isNew={isNew}
          answer={item?.answer ?? item}
          type={typeRaw}
          question={question}
          t={t}
        />
      </div>
    </div>
  );
};

export default RegularQuestionCard;
