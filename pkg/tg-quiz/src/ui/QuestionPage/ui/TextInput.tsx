import { Input } from '@telegram-apps/telegram-ui';
import { useContext, useState } from 'react';
import type { QuizQuestionInput } from '../../../App.context';
import { QuestionContext } from '../Question.context';

export const TextInput = () => {
  const { questions, current, setCurrentAnswer } = useContext(QuestionContext);
  const question = questions[current] as QuizQuestionInput;

  const [value, setValue] = useState<string>('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCurrentAnswer({
      question_uid: question.uid,
      answer: e.target.value,
      question: question.content.title,
    });
    setValue(e.target.value);
  }

  return (
    <div>
      <Input
        value={value}
        onChange={handleChange}
        header={question.content.variant}
      />
    </div>
  );
};
