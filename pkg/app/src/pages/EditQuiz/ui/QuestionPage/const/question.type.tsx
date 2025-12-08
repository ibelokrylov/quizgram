import type { QuizQuestionType } from '@/entities/Quiz/quiz.type';
import {
  Calendar,
  ClipboardList,
  File,
  GalleryVerticalEnd,
  Layers2,
  LayoutList,
  PanelRightOpen,
  SquareMousePointer,
  StarHalf,
  Tally4,
  TextCursorInput,
} from 'lucide-react';

export const questionTypes: { type: QuizQuestionType; title: string; icon: React.ReactNode }[] = [
  {
    type: 'answer_option',
    title: 'question_types.answer_option',
    icon: <ClipboardList />,
  },
  {
    type: 'variant_image',
    title: 'question_types.variant_image',
    icon: <GalleryVerticalEnd />,
  },
  {
    type: 'variant_image_text',
    title: 'question_types.variant_image_text',
    icon: <LayoutList />,
  },
  // {
  //   type: 'emoji',
  //   title: 'question_types.emoji',
  //   icon: <Sticker />,
  // },
  {
    type: 'input',
    title: 'question_types.input',
    icon: <TextCursorInput />,
  },
  {
    type: 'select',
    title: 'question_types.select',
    icon: <SquareMousePointer />,
  },
  {
    type: 'date',
    title: 'question_types.date',
    icon: <Calendar />,
  },
  {
    type: 'slide',
    title: 'question_types.slide',
    icon: <PanelRightOpen />,
  },
  {
    type: 'file',
    title: 'question_types.file',
    icon: <File />,
  },
  {
    type: 'page',
    title: 'question_types.page',
    icon: <Layers2 />,
  },
  {
    type: 'rating',
    title: 'question_types.rating',
    icon: <StarHalf />,
  },
  {
    type: 'question_group',
    title: 'question_types.question_group',
    icon: <Tally4 />,
  },
];
