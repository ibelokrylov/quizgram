import { Text } from '@telegram-apps/telegram-ui';
import { useContext, type PropsWithChildren } from 'react';
import { AppContext } from './App.context';

export const ContentLayout = (props: PropsWithChildren) => {
  const { quiz } = useContext(AppContext);
  return (
    <div className='content'>
      <div className='content__body'>{props.children}</div>
      {quiz?.isShowLogo !== false ? (
        <div className='footer__logo'>
          <Text caps weight={'3'}>
            Сделано в{' '}
            <a
              className='footer__logo-link'
              href={`https://quizgram.site?utm_source=quizgram_miniapp&utm_medium=referral&uuid=${quiz?.uid}`}
              target='_blank'
            >
              Quizgram123
            </a>
          </Text>
        </div>
      ) : null}
    </div>
  );
};
