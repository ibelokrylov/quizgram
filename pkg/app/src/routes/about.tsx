import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/about')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh w-full flex-col p-6 md:p-10">
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">О продукте</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Что такое QuizGram?</h2>
              <p className="text-foreground leading-relaxed">
                QuizGram — это конструктор квизов и мини-приложений в Telegram. Он помогает
                предпринимателям и маркетологам получать заявки внутри Telegram, снижать стоимость
                лида и повышать конверсию без сайтов и сложных воронок.
              </p>
              <p className="text-foreground leading-relaxed">
                Квиз в QuizGram задаёт вопросы, понимает потребности пользователя, показывает
                персональный результат или оффер и ведёт к заявке — прямо в Telegram. Собрать квиз
                или мини-апп можно без кода и без разработчиков.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Что можно создать в QuizGram</h2>
              <p className="text-foreground leading-relaxed">В QuizGram можно собрать:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>квизы для сбора заявок</li>
                <li>квиз-калькуляторы</li>
                <li>квизы-воронки</li>
                <li>Telegram mini-apps с квизовой логикой</li>
                <li>формы под рекламу и Telegram Ads</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-4">
                Всё работает внутри Telegram — без редиректов на сайты и лендинги.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Функциональные возможности</h2>
              <p className="text-foreground leading-relaxed mb-3">С помощью QuizGram можно:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>
                  создавать квизы без кода — визуальный конструктор с готовой логикой и шаблонами
                </li>
                <li>собирать заявки прямо в Telegram — без переходов на сайт</li>
                <li>
                  персонализировать результат — показывать оффер, цену, бонус или следующий шаг в
                  зависимости от ответов
                </li>
                <li>
                  повышать конверсию рекламы — квизы хорошо работают в Telegram Ads и органике
                </li>
                <li>собирать и хранить лиды — контакты пользователей, ответы, сегментация</li>
                <li>
                  интегрировать квизы в воронку продаж — передача заявок менеджерам, в CRM или боты
                </li>
                <li>
                  запускать мини-приложения — быстрые, нативные Telegram Mini Apps с квизовой
                  логикой
                </li>
                <li>
                  масштабировать лидогенерацию — один и тот же квиз можно использовать в рекламе,
                  каналах, ботах и рассылках
                </li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Как начать пользоваться QuizGram</h2>
              <p className="text-foreground leading-relaxed mb-3">
                Чтобы начать работать с QuizGram, нужно:
              </p>
              <ul className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                <li>Зарегистрироваться в сервисе QuizGram.</li>
                <li>
                  Создать квиз или мини-апп:
                  <ul className="list-disc list-inside space-y-1 ml-6 mt-1">
                    <li>с нуля</li>
                    <li>по шаблону</li>
                    <li>под конкретную задачу (лиды, расчёт, запись, консультация)</li>
                  </ul>
                </li>
                <li>
                  Настроить квиз:
                  <ul className="list-disc list-inside space-y-1 ml-6 mt-1">
                    <li>вопросы</li>
                    <li>логику</li>
                    <li>результат или оффер</li>
                  </ul>
                </li>
                <li>Подключить приём заявок и нужные интеграции.</li>
                <li>
                  Опубликовать квиз:
                  <ul className="list-disc list-inside space-y-1 ml-6 mt-1">
                    <li>в Telegram Ads</li>
                    <li>в Telegram-канале</li>
                    <li>в боте или рассылке</li>
                    <li>по прямой ссылке</li>
                  </ul>
                </li>
                <li>Получить первые заявки.</li>
                <li>Улучшать конверсию на основе данных и поведения пользователей.</li>
              </ul>
            </section>

            <Separator />

            <section className="flex justify-center pt-4">
              <Link to="/registration">
                <Button size="lg" className="min-w-[200px]">
                  Начать бесплатно
                </Button>
              </Link>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
