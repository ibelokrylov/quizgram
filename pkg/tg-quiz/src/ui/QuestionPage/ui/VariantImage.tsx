import { Card, Text } from '@telegram-apps/telegram-ui';
import { useContext, useState } from 'react';
import { type QuizQuestionVariantImage } from '../../../App.context';
import { QuestionContext } from '../Question.context';

export const VariantImage = () => {
  const { current, questions, sendAnswer } = useContext(QuestionContext);
  const question = questions[current] as QuizQuestionVariantImage;

  const [selected, setSelected] = useState<number | null>(null);

  function handleSelect(value: Record<string, unknown>, idx: number) {
    sendAnswer({
      question_uid: question.uid,
      answer: value,
    });
    setSelected(idx);
  }
  return (
    <div className="variant__image">
      {question?.content?.variants
        ?.filter((v) => v.url || v.value)
        .map((v, idx) => (
          <Card
            className={`variant__image-item ${selected === idx ? 'selected' : ''}`}
            onClick={() => handleSelect({ value: v.value, url: v.url }, idx)}
            key={idx}
          >
            <div className={`variant__image-item-content ${v?.value ? 'has-value' : ''}`}>
              {v?.url ? (
                <div className={`variant__image-item-image`}>
                  <img src={v.url} alt={v.value} />
                </div>
              ) : null}
              {v?.value ? (
                <div className="variant__image-item-value-text">
                  <Text>{v.value}</Text>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
    </div>
  );
};
