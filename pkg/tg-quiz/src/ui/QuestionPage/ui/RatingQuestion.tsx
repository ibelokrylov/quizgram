import { Rating, Text } from '@telegram-apps/telegram-ui';
import { useContext } from 'react';
import type { QuizQuestionRating } from '../../../App.context';
import { QuestionContext } from '../Question.context';

export const RatingQuestion = () => {
  const { questions, current, sendAnswer } = useContext(QuestionContext);

  const question = questions[current] as QuizQuestionRating;

  return (
    <div className='rating__question'>
      <Rating
        onChange={(e) =>
          sendAnswer({
            question_uid: question.uid,
            answer: e,
            question: question,
          })
        }
        precision={0.5}
      />
      <div className='rating__question-placeholder left'>
        <Text>{question?.content?.left_placeholder}</Text>
      </div>
      <div className='rating__question-placeholder right'>
        <Text>{question?.content?.right_placeholder}</Text>
      </div>
    </div>
  );
};
