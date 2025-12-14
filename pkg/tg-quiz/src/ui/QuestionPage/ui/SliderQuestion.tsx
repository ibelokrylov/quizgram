import { Card, Input, Slider, Text } from '@telegram-apps/telegram-ui';
import { useContext, useEffect, useState } from 'react';
import type { QuizQuestionSlide } from '../../../App.context';
import { QuestionContext } from '../Question.context';

export const SliderQuestion = () => {
  const { questions, current, setCurrentAnswer } = useContext(QuestionContext);
  const question = questions[current] as QuizQuestionSlide;

  const content = question.content?.options;
  const [value, setValue] = useState<number>(content?.default_select ?? 50);

  useEffect(() => {
    setCurrentAnswer({
      question_uid: question.uid,
      answer: content?.default_select ?? 50,
      question: question,
    });
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value === '') {
      setValue(content?.step ?? content?.start ?? 1);
      setCurrentAnswer({
        question_uid: question.uid,
        answer: content?.step ?? content?.start ?? 1,
        question: question,
      });
      return;
    }
    if (isNaN(Number(e.target.value))) {
      return;
    }
    if (Number(e.target.value) < 0) {
      setValue(1);
      setCurrentAnswer({
        question_uid: question.uid,
        answer: 1,
        question: question.content?.title,
      });
      return;
    }
    if (Number(e.target.value) < (content?.step ?? content?.start ?? 1) || Number(e.target.value) > (content?.end ?? 100)) {
      return;
    }
    if (Number(e.target.value) % (content?.step ?? 1) !== 0) {
      return;
    }
    setValue(Number(e.target.value));
    setCurrentAnswer({
      question_uid: question.uid,
      answer: Number(e.target.value),
      question: question,
    });
  }

  return (
    <Card className='slider__question-container'>
      <div>
        <Input
          className='slider__question-input'
          value={value}
          onChange={handleChange}
        />
      </div>
      <Slider
        className='slider__question'
        min={content?.step ?? content?.start}
        max={content?.end}
        step={content?.step}
        value={value}
        onChange={(value) => setValue(value)}
      />
      <div className='slider__question-values'>
        <Text>{content?.step ?? content?.start ?? 1}</Text>
        <Text>{content?.end ?? 100}</Text>
      </div>
    </Card>
  );
};
