import { type PropsWithChildren, useEffect, useState } from 'react';
import { AppContext, type AppContextType, type Quiz } from './App.context';
import { API_BASE_URL } from './config';
import { preloadQuizMedia } from './lib/media-preloader';
import { getLaunchParams, getRawInitData } from './lib/telegram-webapp';

export const AppContextProvider = (props: PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<AppContextType['quiz']>(undefined);
  const [currentStage, setCurrentStage] = useState<string | undefined>(undefined);
  const [allStages, setAllStages] = useState<string[]>([]);
  const [error, setError] = useState(false);

  // Получаем данные от Telegram WebApp API
  const initData = getRawInitData();
  const launchParams = getLaunchParams();

  function generateStages(quiz: Quiz) {
    const stages = [];
    if (quiz.startPage) {
      stages.push('startPage');
    }
    if (quiz.question && quiz.question.length > 0) {
      stages.push('question');
    }
    // Проверяем, что contact - это массив и он не пустой
    if (Array.isArray(quiz.contact) && quiz.contact.length > 0) {
      stages.push('contact');
    }
    if (quiz.thxPage) {
      stages.push('thxPage');
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
      const launchParamsTyped = launchParams as Record<string, unknown>;
      // Поддержка двух режимов:
      // 1. Telegram WebApp: tgWebAppStartParam или startParam из initData
      // 2. Браузер: startApp из URL параметров (?startApp=quizuid)
      // startapp - lowercase версия от Telegram URL, startApp - camelCase версия
      const uid = (launchParamsTyped.tgWebAppStartParam ||
        launchParamsTyped.startParam ||
        launchParamsTyped.startApp ||
        launchParamsTyped.startapp) as string | undefined;

      if (!uid || uid.trim() === '') {
        setError(true);
        setCurrentStage('404');
        setLoading(false);
        return;
      }

      // Делаем запрос к API с initData
      // В dev режиме (когда Telegram WebApp недоступен) не отправляем initData,
      // чтобы сервер не пытался проверить подпись несуществующих данных
      const requestBody: { initData?: string } = {};
      // Отправляем initData только если он есть и не пустой
      if (initData && initData.trim().length > 0) {
        requestBody.initData = initData;
      }

      const response = await fetch(`${API_BASE_URL}/v1/public/quiz/${uid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Для отправки cookies (bidToken)
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        setError(true);
        setCurrentStage('404');
        setLoading(false);
        return;
      }

      const result = await response.json();

      // Проверяем, что данные есть и не пустые
      if (!result || !result.data) {
        setError(true);
        setCurrentStage('404');
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
          if (keys.length === 0 && keys[0] === 'title') {
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
          sessionStorage.setItem('quizKey', result.key);
        } catch (storageError) {
          console.error('Failed to save quiz key to session storage:', storageError);
        }
      }

      setQuiz(result.data);
      generateStages(result.data);
      setLoading(false);

      // Предзагружаем медиа асинхронно (не блокируем UI)
      preloadQuizMedia(result.data).catch((error: unknown) => {
        console.error('Ошибка при предзагрузке медиа:', error);
      });
    } catch (err) {
      console.error('Failed to fetch quiz:', err);
      setError(true);
      setCurrentStage('404');
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchQuiz();
  }, []);

  async function sendAnswer(answer: Record<string, unknown>) {
    const answerValue = answer.answer;
    const isFile = answerValue instanceof File || answerValue instanceof Blob;

    const isFileList = answerValue instanceof FileList;

    // Проверяем, является ли answer массивом (question_group) и содержит ли он файлы
    const isArrayWithFiles =
      Array.isArray(answerValue) &&
      answerValue.some(
        (item: any) =>
          item.answer instanceof File ||
          item.answer instanceof Blob ||
          item.answer instanceof FileList ||
          (Array.isArray(item.answer) &&
            item.answer.some(
              (a: any) => a instanceof File || a instanceof Blob || a instanceof FileList
            ))
      );

    // Извлекаем final_question для добавления в URL
    const finalQuestion = answer.final_question === true ? 'true' : 'false';

    // Удаляем final_question из answer, чтобы не отправлять его в теле запроса
    // quiz_all_question больше не отправляется - он сохраняется автоматически при получении квиза
    const { final_question: _, ...answerBody } = answer;

    // Получаем key из sessionStorage
    let quizKey: string | null = null;
    try {
      quizKey = sessionStorage.getItem('quizKey');
    } catch (error) {
      console.error('Failed to get quiz key from session storage:', error);
    }

    // Добавляем key в тело запроса, если он есть
    const answerWithKey = quizKey ? { ...answerBody, key: quizKey } : answerBody;
    if (!answerWithKey?.question_uid) throw new Error('question_uid not found');

    const formData = new FormData();
    formData.append('key', String(quizKey));
    formData.append('question_uid', String(answer?.question_uid));

    if (isFile || isArrayWithFiles || isFileList) {
      if (isArrayWithFiles) {
        // Для question_group с файлами: отправляем массив как JSON, а файлы отдельно
        const answerArray = answerValue as any[];
        let fileIndex = 0;
        const processedArray = answerArray.map((item) => {
          // item должен быть объектом {question_uid, answer}
          if (item && typeof item === 'object' && 'answer' in item) {
            const itemAnswer = item.answer;
            // Если answer это FileList (multiple files)
            if (itemAnswer instanceof FileList) {
              const filesArray = [];
              for (let i = 0; i < itemAnswer.length && i < 10; i++) {
                const file = itemAnswer[i];
                formData.append(`files`, file);
                const placeholderIndex = fileIndex;
                fileIndex++;
                filesArray.push({
                  __isFile: true,
                  __fileIndex: placeholderIndex,
                  fileName: file.name,
                });
              }
              return {
                question_uid: item.question_uid,
                answer: filesArray,
              };
            }
            // Если answer это один File
            if (itemAnswer instanceof File || itemAnswer instanceof Blob) {
              formData.append(`files`, itemAnswer);
              const fileName = itemAnswer instanceof File ? itemAnswer.name : 'file';
              fileIndex++;
              return {
                question_uid: item.question_uid,
                answer: [
                  {
                    __isFile: true,
                    __fileIndex: fileIndex - 1,
                    fileName: fileName,
                  },
                ],
              };
            }
          }
          return item;
        });

        // Отправляем обработанный массив как JSON
        formData.append('answer', JSON.stringify(processedArray));
      } else {
        // Отрабатывает при одном файле \ несколько файлов ??? (не группа)
        // Обработка FileList (множественная загрузка файлов)

        const processedArray = [];

        if (answerValue instanceof File) {
          formData.append('files', answerValue);
          processedArray.push({
            __fileIndex: 0,
            fileName: answerValue.name,
          });
        }
        if (answerValue instanceof FileList) {
          for (let i = 0; i < answerValue.length && i < 10; i++) {
            const file = answerValue[i];
            formData.append(`files`, file);
            processedArray.push({
              __fileIndex: i,
              fileName: file.name,
            });
          }
        }

        formData.append('answer', JSON.stringify(processedArray));
      }
    } else {
      //Convert answer object body to FormData
      formData.append('answer', JSON.stringify(answerValue));
    }

    const response = await fetch(
      `${API_BASE_URL}/v1/public/quiz/${quiz?.uid}/answer?final_question=${finalQuestion}`,
      {
        method: 'POST',
        body: formData,
      }
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
          currentStage: '404',
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
        currentStage: currentStage || '404', // Гарантируем, что currentStage всегда строка
        setCurrentStage,
        nextStage,
        sendAnswer,
      }}
    >
      {props.children}
    </AppContext.Provider>
  );
};
