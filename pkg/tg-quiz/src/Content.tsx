import { Placeholder, Spinner } from '@telegram-apps/telegram-ui';
import { useContext } from 'react';
import { AppContext } from './App.context';
import { ContentLayout } from './ContentLayout';
import { Contact } from './ui/Contact';
import { QuestionPage } from './ui/QuestionPage';
import { StartPage } from './ui/StartPage';
import { ThxPage } from './ui/ThxPage';

const render = {
  startPage: <StartPage />,
  question: <QuestionPage />,
  contact: <Contact />,
  thxPage: <ThxPage />,
  '404': (
    <Placeholder
      header='404'
      description='Квиз не найден'
    />
  ),
};

export const Content = () => {
  const { loading, quiz, currentStage } = useContext(AppContext);

  // Показываем спиннер во время загрузки
  if (loading) {
    return (
      <ContentLayout>
        <div className='loading-container'>
          <Spinner size='l' />
        </div>
      </ContentLayout>
    );
  }

  // Если загрузка завершена и нет quiz или currentStage = '404' - показываем 404
  if (!loading && (!quiz || currentStage === '404')) {
    return (
      <ContentLayout>
        <div className='loading-container'>
          <Placeholder
            header='404'
            description='Квиз не найден'
          />
        </div>
      </ContentLayout>
    );
  }

  // Если есть currentStage, показываем соответствующий компонент
  if (currentStage) {
    return <ContentLayout>{render[currentStage as keyof typeof render]}</ContentLayout>;
  }

  // Fallback: если нет currentStage, но есть quiz - показываем спиннер (не должно происходить)
  return (
    <ContentLayout>
      <div className='loading-container'>
        <Spinner size='l' />
      </div>
    </ContentLayout>
  );
};
