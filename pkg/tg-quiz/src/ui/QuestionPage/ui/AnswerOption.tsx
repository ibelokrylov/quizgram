import { Cell, Selectable } from '@telegram-apps/telegram-ui';
import { useContext } from 'react';
import { type QuizQuestionAnswerOptions } from '../../../App.context';
import { QuestionContext } from '../Question.context';

export const AnswerOption = () => {
  const { current, questions, sendAnswer } = useContext(QuestionContext);
  const question = questions[current] as QuizQuestionAnswerOptions;

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    sendAnswer({
      question_uid: question.uid,
      answer: e.target.value,
      question: question,
    });
  }

  return (
    <div className='answer__option'>
      {question.content?.variants?.map((variant, idx) => (
        <Cell
          key={idx}
          className='answer__option-item'
          Component='label'
          before={
            <Selectable
              name='group'
              value={variant}
              onChange={handleSelect}
            />
          }
          multiline
        >
          {variant}
        </Cell>
      ))}
    </div>
  );
};
