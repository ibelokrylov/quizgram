import { Button } from '@/components/ui/button';
import type { Quiz, QuizQuestionGroup } from '@/entities/Quiz/quiz.type';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v7 } from 'uuid';
import { Question } from './Question';
import { QuestionLayout } from './QuestionLayout';

export const QuestionGroup = (props: {
  question: Quiz['question'][0];
  setQuestion: (question: Quiz['question'][0]) => void;
}) => {
  if (props.question.type !== 'question_group') return null;

  const content = props.question?.content as QuizQuestionGroup;
  const { t } = useTranslation();

  useEffect(() => {
    if (!content?.questions?.length) {
      props.setQuestion({
        ...props.question,
        content: {
          title: props.question.content?.title ?? 'Заголовок группы вопросов',
          questions: [{ uid: v7() }],
        },
      } as Quiz['question'][0]);
    }
  }, [content]);

  function updateQuestion(question: Quiz['question'][0]) {
    const newQuestion = (content?.questions ?? []).map((i) => {
      if (i.uid === question.uid) {
        return question;
      }
      return i;
    });

    updateQuestions(newQuestion);
  }

  function addQuestion() {
    const newQuestion = content?.questions ?? [];
    //@ts-ignore
    newQuestion.push({ uid: v7() });
    updateQuestions(newQuestion);
  }

  function deleteQuestion(uid: string) {
    updateQuestions(content?.questions?.filter((i) => i.uid !== uid));
  }

  function updateQuestions(questions: Quiz['question']) {
    props.setQuestion({
      ...props.question,
      content: { ...props.question.content, questions },
    });
  }

  const moveQuestionUp = (index: number) => {
    if (index === 0) return;
    const next = [...content.questions];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    updateQuestions(next);
  };

  const moveQuestionDown = (index: number) => {
    if (index === content.questions.length - 1) return;
    const next = [...content.questions];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    updateQuestions(next);
  };

  return (
    <div className="flex flex-col gap-5">
      {content?.questions?.map((i, idx) => (
        <QuestionLayout
          index={idx}
          key={i.uid}
          question={i}
          deleteQuestion={deleteQuestion}
          setQuestion={updateQuestion}
          moveQuestionDown={moveQuestionDown}
          moveQuestionUp={moveQuestionUp}
        >
          <div className="flex flex-col gap-2">
            <Question
              deleteQuestion={deleteQuestion}
              isShowDelete={true}
              key={i.uid}
              question={i}
              updateQuestion={updateQuestion}
            />
          </div>
        </QuestionLayout>
      ))}
      <Button onClick={addQuestion}>{t('edit-quiz.question-page.add-question')}</Button>
    </div>
  );
};
