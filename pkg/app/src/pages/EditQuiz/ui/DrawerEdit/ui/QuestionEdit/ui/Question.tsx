import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CreateQuizContext } from '@/entities/Quiz/CreateQuiz.context';
import { showIdEdges } from '@/entities/Quiz/nodeIds.const';
import type { Quiz } from '@/entities/Quiz/quiz.type';
import { DrawerEditContext } from '@/pages/EditQuiz/context/DrawerEdit.context';
import { t } from 'i18next';
import { useContext } from 'react';
import { AnswerOption } from './AnswerOption';
import { DateQuestion } from './DateQuestion';
import { EmptyQuestion } from './EmptyQuestion';
import { FileQuestion } from './FileQuestion';
import { InputQuestion } from './InputQuestion';
import { PageQuestion } from './PageQuestion';
import { QuestionGroup } from './QuestionGroup';
import { RatingQuestion } from './RatingQuestion';
import { SelectQuestion } from './SelectQuestion';
import { SlideQuestion } from './SlideQuestion';
import { VariantImage } from './VariantImage';

type QuestionProps = {
  question: Quiz['question'][0];
  updateQuestion?: (question: Quiz['question'][0]) => void;
  isShowDelete?: boolean;
  deleteQuestion?: (uid: string) => void;
  addQuestion?: () => void;
};

export const Question = ({ question, isShowDelete, ...props }: QuestionProps) => {
  const { setQuiz, quiz } = useContext(CreateQuizContext);
  const ctx = useContext(DrawerEditContext);

  const updateQuestion = (question: Quiz['question'][0]) => {
    if (props.updateQuestion !== undefined) {
      props.updateQuestion(question);
    } else {
      const next = (quiz?.question ?? []).map((q) => (q.uid === question.uid ? question : q));
      setQuiz({ ...quiz, question: next } as Quiz);
    }
  };

  function updateEmptyQuestion(question: Quiz['question'][0]) {
    if (question.type && showIdEdges.has(question.type)) {
      console.log('udapted', question);
      setQuiz({
        ...quiz,
        edges: quiz?.edges?.map((edg) => {
          if (edg.source === question.uid) {
            return {
              ...edg,
              sourceHandle: question.uid,
            };
          }
          return edg;
        }),
      } as Quiz);
    }
    updateQuestion(question);
  }

  const deleteQuestion = (uid: string) => {
    const questions = quiz?.question ?? [];
    const next = questions.filter((q) => q.uid !== uid);
    ctx?.setUid(null);
    ctx?.setOpen(false);
    ctx;
    setQuiz({ ...quiz, question: next } as Quiz);
  };

  const renderQuestion = {
    answer_option: (question: Quiz['question'][0]) => (
      <AnswerOption question={question} setQuestion={updateQuestion} />
    ),
    variant_image: (question: Quiz['question'][0]) => (
      <VariantImage question={question} setQuestion={updateQuestion} />
    ),
    variant_image_text: (question: Quiz['question'][0]) => (
      <VariantImage type="variant_image_text" question={question} setQuestion={updateQuestion} />
    ),
    input: (question: Quiz['question'][0]) => (
      <InputQuestion question={question} setQuestion={updateQuestion} />
    ),
    select: (question: Quiz['question'][0]) => (
      <SelectQuestion question={question} setQuestion={updateQuestion} />
    ),
    date: (question: Quiz['question'][0]) => (
      <DateQuestion question={question} setQuestion={updateQuestion} />
    ),
    slide: (question: Quiz['question'][0]) => (
      <SlideQuestion question={question} setQuestion={updateQuestion} />
    ),
    file: (question: Quiz['question'][0]) => (
      <FileQuestion question={question} setQuestion={updateQuestion} />
    ),
    page: (question: Quiz['question'][0]) => (
      <PageQuestion question={question} setQuestion={updateQuestion} />
    ),
    rating: (question: Quiz['question'][0]) => (
      <RatingQuestion question={question} setQuestion={updateQuestion} />
    ),
    question_group: (question: Quiz['question'][0]) => (
      <QuestionGroup question={question} setQuestion={updateQuestion} />
    ),
  } as const;

  return (
    <div className="flex flex-col gap-3 items-center w-full">
      <div key={question.uid} className="mb-6 md:mb-4 relative w-full">
        {!question?.type ? (
          <EmptyQuestion showGroup={true} question={question} setQuestion={updateEmptyQuestion} />
        ) : (
          renderQuestion[question.type as keyof typeof renderQuestion]?.(question)
        )}
      </div>

      {isShowDelete ? null : (
        <>
          <Separator />
          <div>
            <Button variant={'destructive'} onClick={() => deleteQuestion(question.uid)}>
              {t('edit-quiz.question-page.question.delete')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
