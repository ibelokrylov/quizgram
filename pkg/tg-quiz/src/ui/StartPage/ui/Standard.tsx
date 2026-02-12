import { Button, Card, Image, List, Placeholder, Spoiler, Text } from '@telegram-apps/telegram-ui';
import { useContext } from 'react';
import { AppContext, type QuizStartPageStandard } from '../../../App.context';

export const Standard = () => {
  const { nextStage, quiz } = useContext(AppContext);

  const startPage = quiz?.startPage as QuizStartPageStandard;

  const data = startPage.content;

  return (
    <>
      {data ? (
        <div className="center__content">
          <div className="start-page__cards-container">
            {/* Шапка - сверху */}
            {data?.name || data?.logo_url ? (
              <div className="start-page__header">
                <Card className={'cards full'}>
                  <div className="card__chip start-page__card-chip">
                    {data?.logo_url ? <Image size={40} src={data.logo_url} /> : null}
                    {data?.name ? (
                      <Text weight={'3'} caps>
                        {data.name}
                      </Text>
                    ) : null}
                  </div>
                </Card>
              </div>
            ) : null}

            {/* Основной контент - в центре */}
            <div className="start-page__main">
              <Card className={'cards full'} style={{ paddingBottom: '1.5rem' }}>
                {data?.title || data?.description ? (
                  <Placeholder header={data?.title} description={data?.description} />
                ) : null}
                <div className="start-page__button-container">
                  <Button onClick={nextStage}>{data?.button ?? 'Пройти опрос'}</Button>
                </div>
              </Card>
            </div>

            {/* Информация - снизу */}
            {data?.company_name || data?.phone || data?.disclamer ? (
              <div className="start-page__footer">
                <Card className="cards full">
                  <List>
                    {data?.company_name ? (
                      <div>
                        <Text size={1}>{data?.company_name}</Text>
                      </div>
                    ) : null}

                    {data?.phone ? (
                      <div>
                        <Text>
                          <a href={`tel:${data?.phone}`}>{data?.phone}</a>
                        </Text>
                      </div>
                    ) : null}
                    <Spoiler>
                      {data?.disclamer ? (
                        <div>
                          <Text>{data?.disclamer}</Text>
                        </div>
                      ) : null}
                    </Spoiler>
                  </List>
                </Card>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
};
