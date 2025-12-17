import { Cell, Selectable, Skeleton } from '@telegram-apps/telegram-ui';
import { useContext, useState } from 'react';
import type { QuizQuestionVariantImageText } from '../../../App.context';
import { QuestionContext } from '../Question.context';

export const VariantImageText = () => {
  const { questions, current, setCurrentAnswer } = useContext(QuestionContext);

  const [selected, setSelected] = useState<number | null>(null);

  const question = questions[current] as QuizQuestionVariantImageText;

  function handleSelect(idx: number) {
    setCurrentAnswer({
      question_uid: question.uid,
      answer: question.content.variants[idx],
    });
    setSelected(idx);
  }

  return (
    <div className='variant__image_text'>
      <div className='variant__image_text-preview'>
        {selected !== null ? (
          <>
            {question.content.variants[selected]?.url ? (
              <img
                src={question.content.variants[selected].url}
                alt={question.content.variants[selected].value}
              />
            ) : (
              <div className='variant__image_text-preview-skeleton'>
                <Skeleton>
                  <Cell>
                    <p>{question.content.variants[selected].value}</p>
                  </Cell>
                </Skeleton>
              </div>
            )}
          </>
        ) : (
          <div className='variant__image_text-preview-skeleton'>
            <Skeleton>
              <Cell>
                <p>Выберите вариант</p>
              </Cell>
            </Skeleton>
          </div>
        )}
      </div>
      <div className='variant__image_text-variants'>
        {question.content.variants
          ?.filter((v) => v.value)
          .map((variant, idx) => (
            <Cell
              key={idx}
              className='answer__option-item'
              Component='label'
              before={
                <Selectable
                  name='group'
                  value={variant.value}
                  onChange={() => handleSelect(idx)}
                />
              }
              multiline
            >
              {variant.value}
            </Cell>
          ))}
      </div>
    </div>
  );
};
