import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/referral")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className={"flex flex-col h-screen p-4"}>
      <h1>Реферальная программа - находится на стадии тестирования</h1>
      <div>
        <p>
          Для запроса доступа напишите в{" "}
          <a
            href="https://t.me/quizgram_support_bot"
            target="_blank"
            rel="noopener noreferrer"
            className={"text-blue-500"}
          >
            бота поддержки
          </a>{" "}
          в Telegram и мы свяжемся с вами в ближайшее время
        </p>
      </div>
    </div>
  );
}
