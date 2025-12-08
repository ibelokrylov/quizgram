import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppContext, type AppContextType, type Quiz } from './App.context';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function getStartAppParam(): string | undefined {
  const uid = window.location.search.split('startapp=')[1];
  return uid;
}

export const AppContextProvider = (props: PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<AppContextType['quiz']>(undefined);
  const [currentStage, setCurrentStage] = useState<string | undefined>(undefined);
  const [allStages, setAllStages] = useState<string[]>([]);
  const [error, setError] = useState(false);

  // const launchParams = useLaunchParams();

  function generateStages(quiz: Quiz) {
    const stages = [];
    if (quiz.startPage) {
      stages.push('startPage');
    }
    if (quiz.question) {
      stages.push('question');
    }
    if (quiz.contact) {
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
      getStartAppParam();
      // Получаем uid из startapp параметра
      // tgWebAppStartParam содержит параметр, переданный в startapp
      // const launchParamsTyped = launchParams as Record<string, unknown>;
      // const uid = (launchParamsTyped.tgWebAppStartParam || launchParamsTyped.startParam) as string | undefined;

      const uid = getStartAppParam();

      if (!uid || typeof uid !== 'string' || uid.trim() === '') {
        setError(true);
        setLoading(false);
        return;
      }

      // Делаем запрос к API
      const response = await fetch(`${API_BASE_URL}/v1/public/quiz/${uid}`, {
        credentials: 'include', // Для отправки cookies (bidToken)
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
      if (result.data.question.length !== 0) {
        const questions = [];
        for (const question of result.data.question) {
          const keys = Object.keys(question.content);
          if (keys.length === 0 && keys[0] === 'title') {
            continue;
          }
          questions.push(question);
        }
        result.data.question = questions;
      }
      setQuiz(result.data);
      generateStages(result.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch quiz:', err);
      setError(true);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchQuiz();
  }, []);

  async function sendAnswer(answer: Record<string, any>) {
    await fetch(`${API_BASE_URL}/v1/public/quiz/${quiz?.uid}/answer`, {
      method: 'POST',
      body: JSON.stringify(answer),
    });
  }

  // Если ошибка - показываем 404 через children (Content компонент обработает это)
  if (error || currentStage === undefined) {
    return (
      <AppContext.Provider value={{ loading: false, setLoading, quiz: undefined, setQuiz, currentStage: '404', setCurrentStage, nextStage, sendAnswer }}>
        {props.children}
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ loading, setLoading, quiz, setQuiz, currentStage, setCurrentStage, nextStage, sendAnswer }}>
      {props.children}
    </AppContext.Provider>
  );
};
