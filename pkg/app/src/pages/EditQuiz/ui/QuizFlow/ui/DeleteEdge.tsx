import { Button } from '@/components/ui/button';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import { BadgeX } from 'lucide-react';

export default function DeleteEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerStart,
  markerEnd,
  style,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.35,
  });

  // const centerX = (targetX - sourceX) / 2 + sourceX;
  // const centerY = (targetY - sourceY) / 2 + sourceY;

  // const edgePath = `
  // M ${sourceX} ${sourceY}
  // Q ${(targetX - sourceX) * 0.2 + sourceX} ${targetY * 1.1} ${centerX} ${centerY}
  // Q ${(targetX - sourceX) * 0.8 + sourceX} ${sourceY * 0.9} ${targetX} ${targetY}
  // `;
  //
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markerStart}
        markerEnd={markerEnd}
        style={style}
      />
      <EdgeLabelRenderer>
        <Button
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onClick={() => {
            setEdges((es) => es.filter((e) => e.id !== id));
          }}
          size={'icon-xs'}
          variant={'destructive-outline'}
        >
          <BadgeX />
        </Button>
      </EdgeLabelRenderer>
    </>
  );
}
