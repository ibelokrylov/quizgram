import { Button } from '@/components/ui/button';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import { showIdEdges } from '@/entities/Quiz/nodeIds.const';
import type { Quiz } from '@/entities/Quiz/quiz.type';
import { DrawerEditContext } from '@/pages/EditQuiz/context/DrawerEdit.context';
import { useNodeId } from '@xyflow/react';
import { t } from 'i18next';
import { Pencil } from 'lucide-react';
import { useContext } from 'react';
import { NodeLayout } from '../NodeLayout';
import { QuestionNodeManyEdges } from './ui/QuestionNodeManyEdges';

function generateIds(question: Quiz['question'][0]): string[] {
  return (question.content?.variants as any[])?.map((_, idx) => String(idx)) || [];
}

export const QuestionNode = () => {
  const { quiz } = useContext(CreateQuizContext);
  const ctxDrawer = useContext(DrawerEditContext);
  const id = useNodeId();
  if (!id) return null;

  const findQuestion = quiz?.question?.find((i) => i.uid === id);
  if (!findQuestion) return null;

  function openDrawer() {
    ctxDrawer?.setType('question');
    ctxDrawer?.setUid(id);
    ctxDrawer?.setOpen(true);
  }

  const isMany = findQuestion.type && showIdEdges.has(findQuestion.type);

  return (
    <NodeLayout showRight={!isMany}>
      <div className="pt-1 flex flex-wrap gap-1 items-center">
        <div className="text-xs">{t(`question_types.${findQuestion.type ?? 'empty'}`)}</div>
        <Button onClick={openDrawer} variant={'ghost'} size={'icon-xs'}>
          <Pencil size={3} />
        </Button>
      </div>
      {isMany ? (
        <QuestionNodeManyEdges uid={findQuestion.uid} ids={generateIds(findQuestion)} />
      ) : null}
    </NodeLayout>
  );
};
