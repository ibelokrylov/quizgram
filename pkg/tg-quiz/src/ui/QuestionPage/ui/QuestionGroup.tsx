import { Text } from '@telegram-apps/telegram-ui';
import { useContext, useState } from 'react';
import type { QuizQuestionGroup } from '../../../App.context';
import { QuestionContext } from '../Question.context';
import { renderQuestion } from '../render';

export const QuestionGroup = () => {
  const { current, questions, setCurrentAnswer } = useContext(QuestionContext);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const question = questions[current] as QuizQuestionGroup;

  function addCurrentAnswer(answer: Record<string, unknown>) {
    const { question_uid } = answer;
    const newAnswers = {
      ...answers,
      [question_uid]: answer
    };
    setAnswers(newAnswers);

    // Convert to array for the final answer
    const answersArray = Object.values(newAnswers);
    setCurrentAnswer({
      question_uid: question.uid,
      answer: answersArray,
      question: question,
    });
  }

  return (
    <div className='question-group'>
      {question.content.questions.map((quest, idx) => (
        <QuestionContext.Provider
          key={quest.uid}
          value={{
            current: idx,
            setCurrent: () => {},
            questions: question.content.questions,
            sendAnswer: addCurrentAnswer,
            setCurrentAnswer: addCurrentAnswer,
          }}
        >
          <Text>{quest.content?.title}</Text>
          {renderQuestion[quest.type as keyof typeof renderQuestion]}
        </QuestionContext.Provider>
      ))}
    </div>
  );
};
