import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/subscription-rules')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh w-full flex-col p-6 md:p-10">
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              Правила подписки на сервис QuizGram
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Общие положения</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  Подписка на сервис QuizGram предоставляет Пользователю доступ к функционалу
                  платформы QuizGram на условиях выбранного тарифного плана.
                </p>
                <p>
                  Подписка является возобновляемой (рекуррентной) и оплачивается на регулярной
                  основе до момента её отмены Пользователем.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Условия оплаты подписки</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  2.1. При оформлении подписки Пользователь соглашается на регулярное списание
                  денежных средств с выбранного способа оплаты.
                </p>
                <p>2.2. Размер платежа и периодичность списаний указываются:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>на странице оформления подписки</li>
                  <li>в форме согласия с подпиской перед оплатой</li>
                </ul>
                <p>2.3. Списание денежных средств производится автоматически:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>в размере, указанном при оформлении подписки</li>
                  <li>
                    с периодичностью, указанной при оформлении подписки (например, один раз в месяц)
                  </li>
                </ul>
                <p>
                  2.4. Подтверждением согласия Пользователя на рекуррентные списания является
                  самостоятельная установка соответствующего чекбокса в форме оплаты.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. Начало действия подписки</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>3.1. Подписка считается активированной с момента успешного первого платежа.</p>
                <p>
                  3.2. С момента активации Пользователю предоставляется доступ к функционалу сервиса
                  в соответствии с выбранным тарифом.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Отмена подписки</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  4.1. Пользователь вправе в любой момент отменить подписку самостоятельно без
                  обращения в службу поддержки.
                </p>
                <p>4.2. Отмена подписки осуществляется:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>в личном кабинете Пользователя в интерфейсе сервиса QuizGram</li>
                  <li>путём нажатия кнопки «Отменить подписку»</li>
                </ul>
                <p>4.3. После отмены подписки:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>дальнейшие списания денежных средств не производятся</li>
                  <li>
                    доступ к сервису сохраняется до конца оплаченного периода (если применимо)
                  </li>
                </ul>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Просмотр статуса подписки</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  5.1. Пользователь может в любое время ознакомиться со статусом своей подписки в
                  личном кабинете сервиса QuizGram.
                </p>
                <p>5.2. В личном кабинете отображается:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>текущий статус подписки</li>
                  <li>дата следующего списания (если подписка активна)</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Возвраты</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  6.1. Возврат денежных средств осуществляется в соответствии с условиями оферты и
                  действующим законодательством.
                </p>
                <p>
                  6.2. Факт отмены подписки не является автоматическим основанием для возврата
                  средств за уже оплаченный период.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Заключительные положения</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>7.1. Оформляя подписку, Пользователь подтверждает, что:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>ознакомился с настоящими Правилами подписки</li>
                  <li>понимает условия регулярных списаний</li>
                  <li>
                    даёт согласие на автоматическое списание денежных средств на указанных условиях
                  </li>
                </ul>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
