import { useLaunchParams, useRawInitData } from "@telegram-apps/sdk-react";
import { useEffect, useState, type PropsWithChildren } from "react";
import { AppContext, type AppContextType, type Quiz } from "./App.context";
import { API_BASE_URL } from "./config";

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
      // const launchParamsTyped = launchParams as Record<string, unknown>;
      // const uidFromLaunchParams = (launchParamsTyped.tgWebAppStartParam || launchParamsTyped.startParam) as string | undefined;
      const uid = getStartAppParam();
      // const uid = uidFromLaunchParams;

      if (!uid || typeof uid !== "string" || uid.trim() === "") {
        setError(true);
        setCurrentStage("404");
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
        setCurrentStage("404");
        setLoading(false);
        return;
      }

      const result = await response.json();

      // Проверяем, что данные есть и не пустые
      if (!result || !result.data) {
        setError(true);
        setCurrentStage("404");
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
      setCurrentStage("404");
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

    // Проверяем, является ли answer массивом (question_group) и содержит ли он файлы
    const isArrayWithFiles = Array.isArray(answerValue) &&
      answerValue.some((item: any) => item instanceof File || item instanceof Blob);

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

    if (isFile || isArrayWithFiles) {
      const formData = new FormData();

      if (isArrayWithFiles) {
        // Для question_group с файлами: отправляем массив как JSON, а файлы отдельно
        const answerArray = answerValue as any[];
        const processedArray = answerArray.map((item, index) => {
          // item должен быть объектом {question_uid, answer}
          if (item && typeof item === 'object' && 'answer' in item) {
            const itemAnswer = item.answer;
            if (itemAnswer instanceof File || itemAnswer instanceof Blob) {
              // Файлы отправляем отдельно с индексом
              formData.append(`file_${index}`, itemAnswer);
              // В массиве оставляем placeholder с сохранением question_uid
              return {
                __isFile: true,
                __fileIndex: index,
                question_uid: item.question_uid
              };
            }
          }
          // Если item сам является File (старая структура), обрабатываем как раньше
          if (item instanceof File || item instanceof Blob) {
            formData.append(`file_${index}`, item);
            return {
              __isFile: true,
              __fileIndex: index
            };
          }
          return item;
        });

        // Отправляем обработанный массив как JSON
        formData.append("answer", JSON.stringify(processedArray));
        formData.append("is_question_group", "true");
      } else {
        // Обычный файл
        formData.append("answer", answerValue as File | Blob);
      }

      // Добавляем остальные поля из answerWithKey, если они есть
      Object.keys(answerWithKey).forEach((key) => {
        const value = answerWithKey[key];
        if (value !== undefined && value !== null && key !== 'answer') {
          // answer уже обработан выше, пропускаем его
          if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            formData.append(key, String(value));
          } else {
            formData.append(key, JSON.stringify(value));
          }
        }
      });

      // Логируем FormData для отладки
      console.log('Sending FormData:', {
        isFile,
        isArrayWithFiles,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => {
          // FormDataEntryValue может быть string или File
          // File наследуется от Blob, поэтому проверяем сначала File
          const isFile = value instanceof File;
          // Для проверки Blob используем type assertion, так как TypeScript не может определить тип из FormData.entries()
          const valueAsAny = value as unknown;
          const isBlob = !isFile && valueAsAny instanceof Blob;
          return {
            key,
            valueType: isFile ? 'File' : isBlob ? 'Blob' : typeof value,
            fileName: isFile ? (value as File).name : undefined,
          };
        }),
      });

      const response = await fetch(
        `${API_BASE_URL}/v1/public/quiz/${quiz?.uid}/answer?final_question=${finalQuestion}`,
        {
          method: "POST",
          body: formData,
          // НЕ устанавливаем Content-Type - браузер установит его автоматически с boundary
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to save answer');
      }
    } else {
      // Отправляем ответ без quiz_all_question (он уже сохранен при получении квиза)
      const response = await fetch(
        `${API_BASE_URL}/v1/public/quiz/${quiz?.uid}/answer?final_question=${finalQuestion}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(answerWithKey),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to save answer');
      }
    }
  }

  // Если ошибка - показываем 404 через children (Content компонент обработает это)
  // Но только если загрузка завершена (loading === false)
  if (!loading && (error || (currentStage === undefined && !quiz))) {
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
        currentStage: currentStage || "404", // Гарантируем, что currentStage всегда строка
        setCurrentStage,
        nextStage,
        sendAnswer,
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
};
