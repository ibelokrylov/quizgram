import { useEffect, useState, type PropsWithChildren } from "react";
import { AppContext, type AppContextType, type Quiz } from "./App.context";
import { useRawInitData, useLaunchParams } from "@telegram-apps/sdk-react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

function getStartAppParam(): string | undefined {
  const uid = window.location.search.split("startapp=")[1];
  return uid;
}

export const AppContextProvider = (props: PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<AppContextType["quiz"]>(undefined);
  const [currentStage, setCurrentStage] = useState<string | undefined>(
    undefined,
  );
  const [allStages, setAllStages] = useState<string[]>([]);
  const [error, setError] = useState(false);

  // Получаем данные от Telegram SDK
  const initData = useRawInitData();
  const launchParams = useLaunchParams();

  function generateStages(quiz: Quiz) {
    const stages = [];
    if (quiz.startPage) {
      stages.push("startPage");
    }
    if (quiz.question && quiz.question.length > 0) {
      stages.push("question");
    }
    // Проверяем, что contact - это массив и он не пустой
    if (Array.isArray(quiz.contact) && quiz.contact.length > 0) {
      stages.push("contact");
    }
    if (quiz.thxPage) {
      stages.push("thxPage");
    }
    setAllStages(stages);
    setCurrentStage(stages[0]);
  }

  function nextStage() {
    if (!currentStage) return;
    const currentIndex = allStages.indexOf(currentStage);
    if (currentIndex < allStages.length - 1) {
      setCurrentStage(allStages[currentIndex + 1]);
    }
  }

  async function fetchQuiz() {
    setLoading(true);
    try {
      // Получаем uid из startapp параметра
      // Сначала пытаемся получить из launchParams (Telegram SDK)
      // Если не получилось - используем getStartAppParam() как fallback
      const launchParamsTyped = launchParams as Record<string, unknown>;
      const uidFromLaunchParams = (launchParamsTyped.tgWebAppStartParam || launchParamsTyped.startParam) as string | undefined;
      const uidFromUrl = getStartAppParam();
      const uid = uidFromLaunchParams || uidFromUrl;

      if (!uid || typeof uid !== "string" || uid.trim() === "") {
        setError(true);
        setLoading(false);
        return;
      }

      // Делаем запрос к API с initData
      const response = await fetch(`${API_BASE_URL}/v1/public/quiz/${uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Для отправки cookies (bidToken)
        body: JSON.stringify({
          initData: initData || undefined,
        }),
      });

      if (!response.ok) {
        setError(true);
        setLoading(false);
        return;
      }

      const result = await response.json();

      // Проверяем, что данные есть и не пустые
      if (!result || !result.data) {
        setError(true);
        setLoading(false);
        return;
      }

      // Сохраняем данные в quiz
      if (
        result.data.question &&
        Array.isArray(result.data.question) &&
        result.data.question.length !== 0
      ) {
        const questions = [];
        for (const question of result.data.question) {
          const keys = Object.keys(question.content);
          if (keys.length === 0 && keys[0] === "title") {
            continue;
          }
          questions.push(question);
        }
        result.data.question = questions;
      } else {
        // Если question отсутствует или пустой, устанавливаем пустой массив
        result.data.question = result.data.question || [];
      }

      // Сохраняем key в session storage (обновляем при каждом запросе)
      if (result.key) {
        try {
          sessionStorage.setItem("quizKey", result.key);
        } catch (storageError) {
          console.error(
            "Failed to save quiz key to session storage:",
            storageError,
          );
        }
      }

      setQuiz(result.data);
      generateStages(result.data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch quiz:", err);
      setError(true);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendAnswer(answer: Record<string, unknown>) {
    const answerValue = answer.answer;
    const isFile = answerValue instanceof File || answerValue instanceof Blob;

    // Извлекаем final_question для добавления в URL
    const finalQuestion = answer.final_question === true ? "true" : "false";

    // Удаляем final_question из answer, чтобы не отправлять его в теле запроса
    // quiz_all_question больше не отправляется - он сохраняется автоматически при получении квиза
    const { final_question: _, ...answerBody } = answer;

    // Получаем key из sessionStorage
    let quizKey: string | null = null;
    try {
      quizKey = sessionStorage.getItem("quizKey");
    } catch (error) {
      console.error("Failed to get quiz key from session storage:", error);
    }

    // Добавляем key в тело запроса, если он есть
    const answerWithKey = quizKey
      ? { ...answerBody, key: quizKey }
      : answerBody;

    if (isFile) {
      const formData = new FormData();
      formData.append("answer", answerValue as File | Blob);

      // Добавляем остальные поля из answerWithKey, если они есть
      Object.keys(answerWithKey).forEach((key) => {
        const value = answerWithKey[key];
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      await fetch(
        `${API_BASE_URL}/v1/public/quiz/${quiz?.uid}/answer?final_question=${finalQuestion}`,
        {
          method: "POST",
          body: formData,
        },
      );
    } else {
      // Отправляем ответ без quiz_all_question (он уже сохранен при получении квиза)
      await fetch(
        `${API_BASE_URL}/v1/public/quiz/${quiz?.uid}/answer?final_question=${finalQuestion}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(answerWithKey),
        },
      );
    }
  }

  // Если ошибка - показываем 404 через children (Content компонент обработает это)
  if (error || currentStage === undefined) {
    return (
      <AppContext.Provider
        value={{
          loading: false,
          setLoading,
          quiz: undefined,
          setQuiz,
          currentStage: "404",
          setCurrentStage,
          nextStage,
          sendAnswer,
        }}
      >
        {props.children}
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider
      value={{
        loading,
        setLoading,
        quiz,
        setQuiz,
        currentStage,
        setCurrentStage,
        nextStage,
        sendAnswer,
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
};
