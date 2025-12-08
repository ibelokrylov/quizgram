import { List, Select } from '@telegram-apps/telegram-ui';
import { useContext, useEffect } from 'react';
import type { QuizQuestionSelect } from '../../../App.context';
import { QuestionContext } from '../Question.context';

export const SelectQuestion = () => {
  const { current, questions, sendAnswer, setCurrentAnswer } = useContext(QuestionContext);
  const question = questions[current] as QuizQuestionSelect;

  useEffect(() => {
    setCurrentAnswer({
      question_uid: question.uid,
      answer: question.content?.variants?.[0] ?? '',
      question: question.content?.title,
    });
  }, []);

  function handleSelect(value: string) {
    sendAnswer({
      question_uid: question.uid,
      answer: value,
      question: question.content?.title,
    });
  }
  return (
    <List>
      <Select
        onChange={(e) => handleSelect(e.target.value)}
        header='Select'
      >
        {question.content?.variants?.map((variant) => (
          <option
            key={variant}
            value={variant}
            onClick={() => handleSelect(variant)}
          >
            {variant}
          </option>
        ))}
      </Select>
    </List>
  );
};
