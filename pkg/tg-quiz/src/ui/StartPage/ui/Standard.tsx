import { Button, Card, Image, Placeholder, Text } from '@telegram-apps/telegram-ui';
import { useContext, useEffect } from 'react';
import { AppContext } from '../../../App.context';

export const Standard = (props: { refparent: React.RefObject<HTMLDivElement | null> }) => {
  const { nextStage, quiz } = useContext(AppContext);

  const data = quiz?.startPage?.content;
  const refparent = props.refparent;

  useEffect(() => {
    const element = refparent.current;
    const url = data?.background_mobile;
    const footer = document.querySelector('.footer__logo') as HTMLElement;

    if (!element) return;

    if (!url) {
      //clear background
      element.setAttribute('style', '');
      // Сбрасываем стили футера
      if (footer) {
        footer.style.position = '';
        footer.style.bottom = '';
        footer.style.left = '';
        footer.style.transform = '';
      }
      return;
    }

    element.setAttribute(
      'style',
      `
        background-image: url(${url});
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        background-attachment: fixed;
        background-color: transparent;
        opacity: 1;
        transition: background-image 0.3s ease-in-out;
        height: 100vh;
        width: 100vw;
      `
    );

    // Прибиваем футер к низу страницы по центру
    if (footer) {
      footer.style.position = 'absolute';
      footer.style.bottom = '6px';
      footer.style.left = '50%';
      footer.style.transform = 'translateX(-50%)';
    }

    // Cleanup при размонтировании
    return () => {
      if (footer) {
        footer.style.position = '';
        footer.style.bottom = '';
        footer.style.left = '';
        footer.style.transform = '';
      }
    };
  }, [data?.background_mobile, refparent]);

  return (
    <>
      {data?.background_mobile ? (
        <div className='center__content'>
          <div className='start-page__cards-container'>
            {data?.name || data?.logo_url ? (
              <Card type='ambient'>
                <div className='card__chip start-page__card-chip'>
                  {data?.logo_url ? (
                    <Image
                      size={40}
                      src={data.logo_url}
                    />
                  ) : null}
                  {data?.name ? (
                    <Text
                      weight={'3'}
                      caps
                    >
                      {data.name}
                    </Text>
                  ) : null}
                </div>
              </Card>
            ) : null}
            <Card
              type='ambient'
              className='cards full standard'
            >
              {data?.title || data?.description ? (
                <Placeholder
                  header={data?.title}
                  description={data?.description}
                />
              ) : null}
              <div className='start-page__button-container'>
                <Button onClick={nextStage}>{data?.button ?? 'Пройти опрос'}</Button>
              </div>
              {data?.company_name || data?.phone || data?.disclamer ? (
                <Card.Cell
                  subhead={data?.company_name}
                  subtitle={data?.disclamer}
                >
                  {data?.phone ? (
                    <Text>
                      <a href={`tel:${data?.phone}`}>{data?.phone}</a>
                    </Text>
                  ) : null}
                </Card.Cell>
              ) : null}
            </Card>
          </div>
        </div>
      ) : (
        <div>CONTENT</div>
      )}
    </>
  );
};
