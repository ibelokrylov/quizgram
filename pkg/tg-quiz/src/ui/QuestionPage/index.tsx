import { Button, Card, Divider, Headline, Progress, Snackbar, Text } from '@telegram-apps/telegram-ui';
import { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../App.context';
import { QuestionContext } from './Question.context';
import { renderQuestion } from './render';

const showNextButton = new Set(['variant_image_text', 'input', 'select']);

const errorMessage = {
  input: 'Введите текст ответа',
  default: 'Выберите вариант ответа',
};

export const QuestionPage = () => {
  const { quiz, nextStage, sendAnswer } = useContext(AppContext);
  const questions = quiz?.question ?? [];
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const question = questions[currentQuestion];
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);

  const [currentAnswer, setCurrentAnswer] = useState<Record<string, unknown> | null>(null);

  console.log(questions);

  useEffect(() => {
    if (questions.length === 0) {
      nextStage();
    }
  }, [questions]);

  function changeCurrentQuestion() {
    const newq = currentQuestion + 1;
    if (newq < questions.length) {
      setCurrentQuestion(newq);
    } else {
      nextStage();
    }
  }

  function sendQuestion(answer: Record<string, unknown>) {
    if (!answer?.answer) {
      setShowSnackbar(true);
      return;
    }
    sendAnswer(answer);
    setTimeout(() => {
      changeCurrentQuestion();
      setCurrentAnswer(null);
    }, 300);
  }

  if (!question) {
    return null;
  }

  return (
    <div>
      {questions.length > 1 ? (
        <div className='question__counter'>
          <Text>
            {currentQuestion + 1} / {questions.length}
          </Text>
        </div>
      ) : null}
      <Card className='cards full'>
        {question?.content?.title ? (
          <Headline
            plain
            weight={'1'}
            className='chip_question'
          >
            {question.content.title}
          </Headline>
        ) : null}
        <div className={question?.content?.title ? 'question__padding' : ''}>
          <QuestionContext.Provider
            value={{ current: currentQuestion, setCurrent: changeCurrentQuestion, questions, sendAnswer: sendQuestion, setCurrentAnswer }}
          >
            {renderQuestion[question.type as keyof typeof renderQuestion]}
          </QuestionContext.Provider>
        </div>
      </Card>
      <Divider />
      <div className='progress__container'>
        <Progress value={(currentQuestion / questions.length) * 100} />
        <div className='progress__buttons'>
          <div>
            {currentQuestion > 0 ? (
              <Button
                mode={'plain'}
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
              >
                Назад
              </Button>
            ) : null}
          </div>
          <div>{showNextButton.has(question.type) ? <Button onClick={() => sendQuestion(currentAnswer ?? {})}>Далее</Button> : null}</div>
        </div>
      </div>
      {showSnackbar ? (
        <Snackbar onClose={() => setShowSnackbar(false)}>
          <Text>{errorMessage[question.type as keyof typeof errorMessage] ?? errorMessage.default}</Text>
        </Snackbar>
      ) : null}
    </div>
  );
};
