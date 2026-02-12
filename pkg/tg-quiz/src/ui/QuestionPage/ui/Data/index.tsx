import { useContext } from 'react';
import type { QuizQuestionDate } from '../../../../App.context';
import { QuestionContext } from '../../Question.context';
import { DateCalendar } from './DateCalendar';
import { DateMask } from './DateMask';

export const DataQuestion = () => {
  const { questions, current } = useContext(QuestionContext);
  const question = questions[current] as QuizQuestionDate;

  if (question.content.type === 'calendar') {
    return <DateCalendar />;
  }

  if (question.content.type === 'mask') {
    return <DateMask />;
  }

  return null;
};
