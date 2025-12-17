import { Text } from '@telegram-apps/telegram-ui';
import { useContext, useEffect } from 'react';
import type { QuizQuestionPage } from '../../../../App.context';
import { QuestionContext } from '../../Question.context';
import { Player } from './ui/Player';

export const PageQuestion = () => {
  const { current, questions, setCurrentAnswer } = useContext(QuestionContext);
  const question = questions[current] as QuizQuestionPage;

  useEffect(() => {
    setCurrentAnswer({
      question_uid: question.uid,
      answer: question,
    });
  }, []);

  return (
    <div className='flex-col'>
      <Text>{question?.content?.text}</Text>
      {question?.content?.url ? (
        <div>
          {question?.content?.type === 'img' ? (
            <img
              src={question?.content?.url}
              alt='image'
              className='page__question-image'
            />
          ) : (
            <Player url={question?.content?.url} />
          )}
        </div>
      ) : null}
    </div>
  );
};
