import { createContext } from 'react';

export type Quiz = {
  uid: string;
  name: string;
  isShowLogo?: boolean;
  startPage: unknown;
  questionTitle: string;
  question: (
    | QuizQuestionAnswerOptions
    | QuizQuestionVariantImage
    | QuizQuestionVariantImageText
    | QuizQuestionInput
    | QuizQuestionSelect
    | QuizQuestionDate
    | QuizQuestionSlide
    | QuizQuestionFile
    | QuizQuestionPage
    | QuizQuestionRating
    | QuizQuestionGroup
  )[];
  contact: QuizContact[];
  thxPage: QuizThxPage | null;
};

export type QuizThxPage = {
  uid: string;
  title: string;
  description: string;
  buttons: QuizThxPageButton[];
  social: QuizThxPageSocial[];
};

export type QuizThxPageButton = {
  link: string;
  title: string;
};

export type QuizThxPageSocial = {
  link: string;
  type: string;
};

export type QuizContact = {
  uid: string;
  title?: string;
  description?: string;
  form?: QuizContactForm[];
  background: string | null;
};

export type QuizContactForm = {
  step: number | undefined;
  type: string;
  label: string | undefined;
  required: boolean;
  placeholder: string | undefined;
  mask: string | undefined;
};

export type QuizStartPage = QuizStartPageStandard;
export type QuizStartPageStandard = {
  'type': 'standard';
  'content': {
    'name'?: string;
    'type'?: 'standard';
    'phone'?: string;
    'title'?: string;
    'button'?: string;
    'logo_url'?: string;
    'disclamer'?: string;
    'show_logo'?: boolean;
    'description'?: string;
    'company_name'?: string;
    'content_align'?: 'left';
    'background_type'?: 'image';
    'background_mobile'?: string;
  };
};

export type QuizQuestionGroup = {
  type: 'question_group';
  uid: string;
  order: number;
  content: {
    title: string;
    questions: (
      | QuizQuestionAnswerOptions
      | QuizQuestionVariantImage
      | QuizQuestionVariantImageText
      | QuizQuestionInput
      | QuizQuestionSelect
      | QuizQuestionDate
      | QuizQuestionSlide
      | QuizQuestionFile
      | QuizQuestionPage
      | QuizQuestionRating
    )[];
  };
};

export type QuizQuestionRating = {
  type: 'rating';
  uid: string;
  order: number;
  content: {
    title?: string;
    left_placeholder?: string;
    right_placeholder?: string;
  };
};

export type QuizQuestionPage = {
  'type': 'page';
  'uid': string;
  'order': number;
  'content'?: {
    'url'?: string;
    'text'?: string;
    'type'?: 'img' | 'video';
    'title'?: string;
  };
};

export type QuizQuestionFile = {
  type: 'file';
  uid: string;
  order: number;
  content: {
    title?: string;
    type: 'image' | 'video' | 'docs' | 'all';
  };
};

export type QuizQuestionSlide = {
  'type': 'slide';
  'uid': string;
  'order': number;
  'content': {
    'title': string;
    'options'?: {
      'end'?: number;
      'step'?: number;
      'start'?: number;
      'default_select'?: number;
    };
  };
};

export type QuizQuestionDate = {
  'type': 'date';
  'uid': string;
  'order': number;
  'content': {
    'type': 'calendar' | 'mask';
    'title'?: string;
  };
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
    isShowLogo: true,
    startPage: null,
    questionTitle: '',
    question: [],
    contact: [],
    thxPage: null,
  },
  setQuiz: () => {},
  currentStage: 'start',
  setCurrentStage: () => {},
  nextStage: () => {},
  sendAnswer: () => {},
});
