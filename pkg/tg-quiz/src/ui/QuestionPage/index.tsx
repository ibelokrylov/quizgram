import {
  Button,
  Card,
  Divider,
  Placeholder,
  Progress,
  Snackbar,
  Text,
} from "@telegram-apps/telegram-ui";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../../App.context";
import { QuestionContext } from "./Question.context";
import { renderQuestion } from "./render";

const showNextButton = new Set([
  "variant_image_text",
  "input",
  "select",
  "date",
  "slide",
  "page",
  "question_group",
]);

const errorMessage = {
  input: "Введите текст ответа",
  date: "Выберите дату",
  default: "Выберите вариант ответа",
  question_group: "Выберите все варианты ответа",
};

export const QuestionPage = () => {
  const { quiz, nextStage, sendAnswer } = useContext(AppContext);
  const questions = quiz?.question ?? [];
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const question = questions[currentQuestion];
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);

  const [currentAnswer, setCurrentAnswer] = useState<Record<
    string,
    unknown
  > | null>(null);

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
    if (question?.content?.required !== undefined) {
      if (question.content.required) {
        if (
          question.type === "question_group" &&
          question?.content?.questions?.length !==
            (answer.answer as Record<string, unknown>[])?.length
        ) {
          setShowSnackbar(true);
          return;
        }

        // Проверяем, что answer существует и answer.answer не является null или undefined
        // Для числовых значений (например, slide) 0 является валидным ответом
        if (
          answer === null ||
          answer === undefined ||
          answer.answer === null ||
          answer.answer === undefined
        ) {
          setShowSnackbar(true);
          return;
        }
      } else {
        if (
          answer === null ||
          answer === undefined ||
          answer.answer === null ||
          answer.answer === undefined
        ) {
          answer = {
            answer: "SKIP",
            key: sessionStorage.getItem("quizKey"),
            question_uid: question.uid,
          };
        }
      }
    } else {
      if (question.type === "question_group") {
        try {
          let ok = true;
          const answers = answer.answer as {
            answer: unknown;
            question_uid: string;
          }[];

          for (const quest of question.content.questions) {
            const find = answers.find((i) => i.question_uid === quest.uid);

            switch (true) {
              case quest.content?.required === undefined: {
                if (!find) ok = false;
                break;
              }
              case quest.content?.required === true: {
                if (!find) ok = false;
                break;
              }
              default:
                if (!find) {
                  answers.push({
                    answer: "SKIP",
                    question_uid: quest.uid,
                  });
                }
            }
          }
          if (!ok) {
            setShowSnackbar(true);
            return;
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        // Проверяем, что answer существует и answer.answer не является null или undefined
        // Для числовых значений (например, slide) 0 является валидным ответом
        if (
          answer === null ||
          answer === undefined ||
          answer.answer === null ||
          answer.answer === undefined
        ) {
          setShowSnackbar(true);
          return;
        }
      }
    }

    // Проверяем, является ли этот вопрос последним
    const isFinalQuestion = currentQuestion === questions.length - 1;

    // Добавляем финальные данные в ответ
    // quiz_all_question больше не отправляется - он сохраняется автоматически при получении квиза
    const answerWithFlags = {
      ...answer,
      final_question: isFinalQuestion,
    };

    sendAnswer(answerWithFlags);
    setTimeout(() => {
      changeCurrentQuestion();
      setCurrentAnswer(null);
    }, 300);
  }

  if (!question) {
    return null;
  }

  return (
    <div className="content__question">
      {questions.length > 1 ? (
        <div className="question__counter">
          <Text>
            {currentQuestion + 1} / {questions.length}
          </Text>
        </div>
      ) : null}
      <Card className="cards full question">
        {question?.content?.title || question?.content?.description ? (
          <Placeholder
            className="question-header"
            header={question?.content?.title}
            description={question?.content?.description}
          />
        ) : null}
        <div className={question?.content?.title ? "question__padding" : ""}>
          <QuestionContext.Provider
            value={{
              current: currentQuestion,
              setCurrent: changeCurrentQuestion,
              questions,
              sendAnswer: sendQuestion,
              setCurrentAnswer,
            }}
          >
            <div key={currentQuestion}>
              {renderQuestion[question.type as keyof typeof renderQuestion]}
            </div>
          </QuestionContext.Provider>
        </div>
      </Card>
      <Divider />
      <div className="progress__container">
        <Progress value={(currentQuestion / questions.length) * 100} />
        <div className="progress__buttons">
          <div>
            {currentQuestion > 0 ? (
              <Button
                mode={"bezeled"}
                onClick={() => setCurrentQuestion(currentQuestion - 1)}
              >
                Назад
              </Button>
            ) : null}
          </div>
          <div className="question-button-left">
            {question?.content?.required !== undefined ? (
              question.content.required ? null : (
                <Button
                  onClick={() => sendQuestion(currentAnswer ?? {})}
                  mode="plain"
                >
                  Пропустить
                </Button>
              )
            ) : null}
            {showNextButton.has(question.type) ? (
              <Button onClick={() => sendQuestion(currentAnswer ?? {})}>
                Далее
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {showSnackbar ? (
        <Snackbar onClose={() => setShowSnackbar(false)}>
          <Text>
            {errorMessage[question.type as keyof typeof errorMessage] ??
              errorMessage.default}
          </Text>
        </Snackbar>
      ) : null}
    </div>
  );
};
