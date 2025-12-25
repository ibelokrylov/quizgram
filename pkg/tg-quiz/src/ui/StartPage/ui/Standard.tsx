import {
  Button,
  Card,
  Image,
  Placeholder,
  Text,
} from "@telegram-apps/telegram-ui";
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
            {data?.name || data?.logo_url ? (
              <Card>
                <div className="card__chip start-page__card-chip">
                  {data?.logo_url ? (
                    <Image size={40} src={data.logo_url} />
                  ) : null}
                  {data?.name ? (
                    <Text weight={"3"} caps>
                      {data.name}
                    </Text>
                  ) : null}
                </div>
              </Card>
            ) : null}
            <Card className="cards full standard">
              {data?.title || data?.description ? (
                <Placeholder
                  header={data?.title}
                  description={data?.description}
                />
              ) : null}
              <div className="start-page__button-container">
                <Button onClick={nextStage}>
                  {data?.button ?? "Пройти опрос"}
                </Button>
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
