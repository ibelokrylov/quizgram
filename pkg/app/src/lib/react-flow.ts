import type { Quiz } from '@/entities/Quiz/quiz.type';
import { v7 } from 'uuid';

export type FlowNodeType = 'startPage' | 'question' | 'result' | 'contactForm' | 'thx';
export type FlowNode = {
  id: string;
  position: { x: number; y: number };
  type: FlowNodeType;
  data?: { type?: string; main?: string };
};

export type FlowEdgeType = 'custom-edge';
export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  type: FlowEdgeType;
  sourceHandle?: string;
};

export function generateQuizEdgesAndNodesEmpty(
  quiz: Quiz & { isLoadToServer: boolean }
): (Quiz & { isLoadToServer: boolean }) | null {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  if (quiz?.nodes === undefined) {
    if (quiz.startPage && Array.isArray(quiz.startPage)) {
      nodes.push({
        id: v7(),
        position: { x: 0, y: (nodes.length + 1) * 80 },
        type: 'startPage',
      });
    }

    if (quiz.question.length !== 0) {
      for (const q of quiz.question) {
        nodes.push({
          id: q.uid,
          position: { x: 0, y: (nodes.length + 1) * 80 },
          type: 'question',
          data: { type: q.type, main: 'question' },
        });
      }
    }

    if (quiz.results && quiz.results?.length !== 0) {
      for (const r of quiz.results) {
        nodes.push({
          id: r.uid,
          position: { x: 0, y: (nodes.length + 1) * 80 },
          type: 'result',
        });
      }
    }

    if (quiz.contact?.length) {
      for (const c of quiz.contact) {
        nodes.push({
          id: c.uid,
          position: {
            x: 0,
            y: (nodes.length + 1) * 80,
          },
          type: 'contactForm',
        });
      }
    }

    if (quiz.thxPage) {
      nodes.push({
        id: quiz.thxPage.uid,
        position: {
          x: 0,
          y: (nodes.length + 1) * 80,
        },
        type: 'thx',
      });
    }
  }

  if (quiz.edges === undefined) {
    for (const [idx, n] of nodes.entries()) {
      if (nodes[idx + 1] !== undefined) {
        edges.push(
          n?.data?.main === 'question'
            ? {
                id: v7(),
                source: n.id,
                target: nodes[idx + 1].id,
                type: 'custom-edge',
                sourceHandle: n.id,
              }
            : {
                id: v7(),
                source: n.id,
                target: nodes[idx + 1].id,
                type: 'custom-edge',
              }
        );
      }
    }
  }

  if (nodes.length) {
    quiz.edges = edges;
    quiz.nodes = nodes;
    return quiz;
  }

  return null;
}
