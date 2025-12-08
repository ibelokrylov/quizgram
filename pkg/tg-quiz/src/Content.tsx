import { Placeholder, Spinner } from '@telegram-apps/telegram-ui';
import { useContext } from 'react';
import { AppContext } from './App.context';
import { ContentLayout } from './ContentLayout';
import { Contact } from './ui/Contact';
import { QuestionPage } from './ui/QuestionPage';
import { StartPage } from './ui/StartPage';

const render = {
  startPage: <StartPage />,
  question: <QuestionPage />,
  contact: <Contact />,
  thxPage: <div>Thx page</div>,
  '404': (
    <Placeholder
      header='404'
      description='Квиз не найден'
    />
  ),
};

export const Content = () => {
  const { loading, quiz, currentStage } = useContext(AppContext);

  if (loading) {
    return (
      <ContentLayout>
        <Spinner size='l' />
      </ContentLayout>
    );
  }

  // Если нет quiz и не загрузка - показываем 404
  if (!quiz && currentStage !== '404') {
    return (
      <ContentLayout>
        <Placeholder
          header='404'
          description='Квиз не найден'
        />
      </ContentLayout>
    );
  }

  return <ContentLayout>{render[currentStage as keyof typeof render]}</ContentLayout>;
};
