import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import { useContext } from 'react';
import { NodeLayout } from './NodeLayout';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { DrawerEditContext } from '@/pages/EditQuiz/context/DrawerEdit.context';

export const StartPageNode = () => {
  const { quiz } = useContext(CreateQuizContext);
  const ctxDrawer = useContext(DrawerEditContext);

  function openDrawerEdit(uid?: string) {
    if (!uid) return;

    ctxDrawer?.setUid(uid);
    ctxDrawer?.setType('startPage');
    ctxDrawer?.setOpen(true);
  }

  return (
    <NodeLayout showTop={false}>
      <div className="flex flex-wrap gap-1 justify-center py-0.5 items-center">
        {(Array.isArray(quiz?.startPage) ? quiz?.startPage : [quiz?.startPage])?.map((i, idx) => (
          <Button
            onClick={() => openDrawerEdit(i?.uuid)}
            variant={'ghost'}
            size={'sm'}
            key={i?.uuid}
            className="mt-1"
          >
            <div className="flex items-center gap-3">
              <div> {idx === 0 ? 'A' : 'B'}</div>
              <Pencil />
            </div>
          </Button>
        ))}
      </div>
    </NodeLayout>
  );
};
