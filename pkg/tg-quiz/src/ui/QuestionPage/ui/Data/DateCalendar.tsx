import { Card } from '@telegram-apps/telegram-ui';
import { useContext, useState } from 'react';
import { Calendar } from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { QuestionContext } from '../../Question.context';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export const DateCalendar = () => {
  const { setCurrentAnswer, questions, current } = useContext(QuestionContext);
  const question = questions[current];

  const [value, setValue] = useState<Value>(new Date());

  function onChange(value: Value) {
    setCurrentAnswer({
      question_uid: question.uid,
      answer: value,
    });
    setValue(value);
  }

  return (
    <Card className="date_container">
      <Calendar className={'date_calendar'} value={value} onChange={onChange} />
    </Card>
  );
};
