import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Handle, Position } from '@xyflow/react';
import { t } from 'i18next';

type Props = {
  ids: string[];
  uid: string;
};

export const QuestionNodeManyEdges = (props: Props) => {
  const count = props.ids.length;
  const getLeft = (idx: number) => {
    if (count === 1) return '12px';
    return `calc(12px + ${idx} * (100% - 24px) / ${count - 1})`;
  };
  return (
    <>
      {props.ids.map((i, idx) => (
        <Tooltip key={i}>
          <TooltipTrigger asChild>
            <Handle
              key={i}
              type="source"
              position={Position.Bottom}
              id={i}
              style={{ left: getLeft(idx) }}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('question.flow.badge.tooltip', { number: idx + 1 })}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      <Handle type={'source'} position={Position.Right} id={props.uid} />
    </>
  );
};
