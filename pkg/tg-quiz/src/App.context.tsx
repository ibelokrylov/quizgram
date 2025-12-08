import { createContext } from 'react';

export type Quiz = {
  uid: string;
  name: string;
  startPage: unknown;
  questionTitle: string;
  question: (QuizQuestionAnswerOptions | QuizQuestionVariantImage | QuizQuestionVariantImageText | QuizQuestionInput | QuizQuestionSelect)[];
  contact: unknown;
  thxPage: unknown;
  hideLogo: boolean;
};

export type QuizQuestionSelect = {
  type: 'select';
  uid: string;
  order: number;
  content: {
    title?: string;
    variants?: string[];
  };
};

export type QuizQuestionInput = {
  type: 'input';
  uid: string;
  order: number;
  content: {
    title?: string;
    variant?: string;
  };
};

export type QuizQuestionAnswerOptions = {
  type: 'answer_option';
  uid: string;
  order: number;
  content: {
    title?: string;
    variants?: string[];
  };
};

export type QuizQuestionVariantImage = {
  type: 'variant_image';
  uid: string;
  order: number;
  content: {
    title?: string;
    variants: { url?: string; value?: string }[];
  };
};

export type QuizQuestionVariantImageText = {
  type: 'variant_image_text';
  uid: string;
  order: number;
  content: {
    title?: string;
    variants: { url?: string; value?: string }[];
  };
};

export type AppContextType = {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  quiz?: Quiz;
  setQuiz: (quiz: Quiz) => void;
  currentStage: string;
  setCurrentStage: (stage: string) => void;
  nextStage: () => void;
  sendAnswer: (answer: Record<string, unknown>) => void;
};

export const AppContext = createContext<AppContextType>({
  loading: true,
  setLoading: () => {},
  quiz: {
    uid: '',
    name: '',
    startPage: null,
    questionTitle: '',
    question: [],
    contact: [],
    thxPage: null,
    hideLogo: false,
  },
  setQuiz: () => {},
  currentStage: 'start',
  setCurrentStage: () => {},
  nextStage: () => {},
  sendAnswer: () => {},
});
