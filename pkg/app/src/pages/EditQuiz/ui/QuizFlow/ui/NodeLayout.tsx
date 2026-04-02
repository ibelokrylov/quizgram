import { Handle, Position, useNodeId, useNodesData } from '@xyflow/react';
import { t } from 'i18next';
import { type PropsWithChildren } from 'react';

type Props = {
  showRight?: boolean;
  showTop?: boolean;
};

export const NodeLayout = ({
  showRight = true,
  showTop = true,
  ...props
}: PropsWithChildren & Props) => {
  const id = useNodeId();
  if (!id) return null;
  const nodeData = useNodesData(id);

  return (
    <div className="px-3 py-2 border z-10 border-slate-700 rounded-md relative bg-white dark:bg-black min-w-40 min-h-10">
      <div className="absolute z-20 -top-1.5 left-1 text-[6px] bg-white dark:bg-black rounded-md px-0.5">
        {t(`node.type.${nodeData?.type}`)}
      </div>
      <div className="absolute text-[5px] top-0.5 left-1.5 text-gray-400">{id}</div>

      {props.children}
      {showTop ? <Handle type="target" position={Position.Top} /> : null}
      {showRight ? <Handle type="source" position={Position.Right} id={id} /> : null}
    </div>
  );
};
