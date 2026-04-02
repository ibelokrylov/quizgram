import { CreateQuizContext } from "@/entities/Quiz/CreateQuiz.context";
import { useIsMobile } from "@/hooks/use-mobile";
import type { FlowNodeType } from "@/lib/react-flow";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import "@xyflow/react/dist/style.css";
import { debounce } from "lodash-es";
import { useCallback, useContext, useEffect, useMemo, useRef } from "react";

import { ContactNode } from "./ui/ContactNode";
import DeleteEdge from "./ui/DeleteEdge";
import { QuestionNode } from "./ui/QuestionNode";
import { ResultNode } from "./ui/ResultNode";
import { StartPageNode } from "./ui/StartPageNode";
import { ThxNode } from "./ui/ThxNode";

export const QuizFlow = (props: {
  className?: string;
  onInit?: (instance: ReactFlowInstance) => void;
}) => {
  const { quiz, setQuiz } = useContext(CreateQuizContext);
  const isMobile = useIsMobile();

  const [nodes, setNodes, onNodesChange] = useNodesState(quiz?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(quiz?.edges ?? []);

  const isExternalUpdate = useRef(false);

  const quizRef = useRef(quiz);
  quizRef.current = quiz;

  const edgeTypes = useMemo(
    () => ({
      "custom-edge": DeleteEdge,
    }),
    [],
  );

  const nodeTypes = useMemo(
    () =>
      ({
        question: QuestionNode,
        contactForm: ContactNode,
        result: ResultNode,
        startPage: StartPageNode,
        thx: ThxNode,
      }) satisfies Record<FlowNodeType, any>,
    [],
  );

  const onConnect = useCallback((connection: any) => {
    setEdges((eds) => addEdge({ ...connection, type: "custom-edge" }, eds));
  }, []);

  useEffect(() => {
    if (!quiz?.nodes) return;

    const currentNodeIds = new Set(nodes.map((n) => n.id));
    const newNodes = quiz.nodes.filter((n) => !currentNodeIds.has(n.id));

    if (newNodes.length > 0) {
      isExternalUpdate.current = true;
      setNodes((prev) => [...prev, ...newNodes]);
    }
  }, [quiz?.nodes]);

  const syncQuiz = useMemo(
    () =>
      debounce((nodes, edges) => {
        if (isExternalUpdate.current) {
          isExternalUpdate.current = false;
          return;
        }
        const currentQuiz = quizRef.current;
        if (!currentQuiz) return;
        setQuiz({ ...currentQuiz, nodes, edges });
      }, 300),
    [setQuiz],
  );

  useEffect(() => {
    syncQuiz(nodes, edges);
  }, [nodes, edges, syncQuiz]);

  useEffect(() => {
    return () => {
      syncQuiz.cancel();
    };
  }, [syncQuiz]);

  return (
    <div className={props.className}>
      <ReactFlow       
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={props.onInit}
        edgeTypes={edgeTypes}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        {!isMobile && (
          <>
            <Controls />
            <MiniMap />
          </>
        )}
      </ReactFlow>
    </div>
  );
};
