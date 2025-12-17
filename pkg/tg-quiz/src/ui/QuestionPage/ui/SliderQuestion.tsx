import { Card, Input, Slider, Text } from '@telegram-apps/telegram-ui';
import { useContext, useEffect, useState } from 'react';
import type { QuizQuestionSlide } from '../../../App.context';
import { QuestionContext } from '../Question.context';

export const SliderQuestion = () => {
  const { questions, current, setCurrentAnswer } = useContext(QuestionContext);
  const question = questions[current] as QuizQuestionSlide;

  const content = question.content?.options;
  const defaultValue = content?.default_select ?? 50;
  const [value, setValue] = useState<number>(defaultValue);

  // Устанавливаем ответ при монтировании и при смене вопроса
  useEffect(() => {
    const answerValue = content?.default_select ?? 50;
    setValue(answerValue);
    setCurrentAnswer({
      question_uid: question.uid,
      answer: answerValue,
    });
  }, [question.uid, content?.default_select, setCurrentAnswer]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value === '') {
      const newValue = content?.step ?? content?.start ?? 1;
      setValue(newValue);
      setCurrentAnswer({
        question_uid: question.uid,
        answer: newValue,
      });
      return;
    }
    if (isNaN(Number(e.target.value))) {
      return;
    }
    if (Number(e.target.value) < 0) {
      const newValue = 1;
      setValue(newValue);
      setCurrentAnswer({
        question_uid: question.uid,
        answer: newValue,
      });
      return;
    }
    if (Number(e.target.value) < (content?.step ?? content?.start ?? 1) || Number(e.target.value) > (content?.end ?? 100)) {
      return;
    }
    if (Number(e.target.value) % (content?.step ?? 1) !== 0) {
      return;
    }
    const newValue = Number(e.target.value);
    setValue(newValue);
    setCurrentAnswer({
      question_uid: question.uid,
      answer: newValue,
    });
  }

  function handleSliderChange(newValue: number) {
    setValue(newValue);
    setCurrentAnswer({
      question_uid: question.uid,
      answer: newValue,
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
        onChange={handleSliderChange}
      />
      <div className='slider__question-values'>
        <Text>{content?.step ?? content?.start ?? 1}</Text>
        <Text>{content?.end ?? 100}</Text>
      </div>
    </Card>
  );
};
