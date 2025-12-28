import { Button, Card, Image, List, Placeholder, Text } from "@telegram-apps/telegram-ui";
import { useContext } from "react";
import { AppContext, type QuizStartPageStandard } from "../../../App.context";

export const Standard = () => {
  const { nextStage, quiz } = useContext(AppContext);

  const startPage = quiz?.startPage as QuizStartPageStandard;

  const data = startPage.content;

  return (
    <>
      {data ? (
        <div className="center__content">
          <div className="start-page__cards-container">
            <List>
              {data?.name || data?.logo_url ? (
                <Card className={"cards full"}>
                  <div className="card__chip start-page__card-chip">
                    {data?.logo_url ? <Image size={40} src={data.logo_url} /> : null}
                    {data?.name ? (
                      <Text weight={"3"} caps>
                        {data.name}
                      </Text>
                    ) : null}
                  </div>
                </Card>
              ) : null}
              {data?.title || data?.description ? (
                <Placeholder header={data?.title} description={data?.description} />
              ) : null}
              {data?.company_name || data?.phone || data?.disclamer ? (
                <Card className="cards full">
                  <List>
                    {data?.company_name ? (
                      <div>
                        <Text>{data?.company_name}</Text>
                      </div>
                    ) : null}
                    {data?.disclamer ? (
                      <div>
                        <Text>{data?.disclamer}</Text>
                      </div>
                    ) : null}
                    {data?.phone ? (
                      <div>
                        <Text>
                          <a href={`tel:${data?.phone}`}>{data?.phone}</a>
                        </Text>
                      </div>
                    ) : null}
                  </List>
                </Card>
              ) : null}
              <div className="start-page__button-container">
                <Button onClick={nextStage}>{data?.button ?? "Пройти опрос"}</Button>
              </div>
            </List>
          </div>
        </div>
      ) : null}
    </>
  );
};
