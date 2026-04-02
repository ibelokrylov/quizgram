import { Pencil } from 'lucide-react';
import { NodeLayout } from './NodeLayout';
import { Button } from '@/components/ui/button';
import { useNodeId } from '@xyflow/react';
import { useContext } from 'react';
import { DrawerEditContext } from '@/pages/EditQuiz/context/DrawerEdit.context';
import { t } from 'i18next';

export const ResultNode = () => {
  const ctxDrawer = useContext(DrawerEditContext);

  const id = useNodeId();
  if (!id) return null;

  function openDrawer() {
    ctxDrawer?.setType('resaults');
    ctxDrawer?.setUid(id);
    ctxDrawer?.setOpen(true);
  }

  return (
    <NodeLayout>
      <div className={'flex items-center gap-2'}>
        <div className={'text-xs'}>{t('result_node')}</div>
        <Button onClick={openDrawer} variant={'ghost'} size={'icon-xs'}>
          <Pencil />
        </Button>
      </div>
    </NodeLayout>
  );
};
