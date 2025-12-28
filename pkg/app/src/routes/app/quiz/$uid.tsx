import { get, set } from "@/app/db/index-db";
import { CreateQuizContextProvider } from "@/entities/Quiz/CreateQuiz.context";
import type { Quiz } from "@/entities/Quiz/quiz.type";
import http from "@/lib/http";
import { EditQuiz } from "@/pages/EditQuiz";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { v7 } from "uuid";

export const Route = createFileRoute("/app/quiz/$uid")({
  component: RouteComponent,
  loader: async ({ params }) => {
    try {
      const { uid } = params;
      const check = await get<{ data: Quiz; isLoadToServer: boolean }>(uid);
      if (check) {
        return { quiz: check.data, isLoadToServer: check.isLoadToServer };
      }
      const { data } = await http<Quiz>({ url: `/v1/quiz/${uid}` });
      let isLoadToServer = true;

      if (!data?.contact || data?.contact?.length === 0) {
        data.contact = [
          {
            uid: v7(),
            form: [
              {
                type: "name",
                label: "Имя",
                placeholder: "Иван",
                required: true,
                mask: undefined,
                step: 0,
              },
              {
                type: "email",
                label: "Email",
                placeholder: "mail@example.com",
                required: true,
                mask: undefined,
                step: 0,
              },
              {
                type: "phone",
                label: "Телефон",
                placeholder: "+7 (999) 999-99-99",
                required: true,
                mask: "+7 (###) ###-##-##",
                step: 0,
              },
            ],
          },
        ];
        isLoadToServer = false;
      }
      if (!data?.question?.length) {
        data.question = [{ uid: v7() }];
        isLoadToServer = false;
      }
      if (Object.keys(data?.thxPage ?? {})?.length === 0) {
        data.thxPage = {
          uid: v7(),
          title: "Спасибо, [name]!",
          description: "Здесь может быть любой текст",
          buttons: [],
          social: [],
        };
        isLoadToServer = false;
      }
      console.log("data", data);
      await set(uid, { data: data, isLoadToServer });
      return { quiz: data, isLoadToServer };
    } catch (error) {
      console.log(error);
      return { quiz: undefined, isLoadToServer: true };
    }
  },
});

function RouteComponent() {
  const { quiz, isLoadToServer } = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    if (!quiz) {
      navigate({ to: "/app" });
    }
  }, [quiz]);

  if (!quiz) {
    return <div>Quiz not found</div>;
  }

  return (
    <CreateQuizContextProvider
      quiz={quiz}
      isLoadToServer={isLoadToServer}
      key={quiz.uid + new Date().getTime().toString()}
    >
      <EditQuiz key={new Date().getTime().toString()} />
    </CreateQuizContextProvider>
  );
}
