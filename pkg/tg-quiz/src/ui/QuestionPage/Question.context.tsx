import { createContext } from 'react';
import type { Quiz } from '../../App.context';

export const QuestionContext = createContext<{
  current: number;
  setCurrent: () => void;
  questions: Quiz['question'];
  sendAnswer: (answer: Record<string, unknown>) => void;
  setCurrentAnswer: (answer: Record<string, unknown>) => void;
}>({
  current: 0,
  setCurrent: () => {},
  questions: [],
  sendAnswer: () => {},
  setCurrentAnswer: () => {},
});
