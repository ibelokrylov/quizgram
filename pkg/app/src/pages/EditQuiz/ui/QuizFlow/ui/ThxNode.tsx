import { Button } from '@/components/ui/button';
import { DrawerEditContext } from '@/pages/EditQuiz/context/DrawerEdit.context';
import { useNodeId } from '@xyflow/react';
import { t } from 'i18next';
import { Pencil } from 'lucide-react';
import { useContext } from 'react';
import { NodeLayout } from './NodeLayout';

export const ThxNode = () => {
  const ctxDrawer = useContext(DrawerEditContext);

  const id = useNodeId();
  if (!id) return null;

  function openDrawer() {
    ctxDrawer?.setType('contact');
    ctxDrawer?.setUid(id);
    ctxDrawer?.setOpen(true);
  }

  return (
    <NodeLayout>
      <div className={'flex items-center gap-2'}>
        <div className={'text-xs'}>{t('thx_node')}</div>
        <Button onClick={openDrawer} variant={'ghost'} size={'icon-xs'}>
          <Pencil />
        </Button>
      </div>
    </NodeLayout>
  );
};
