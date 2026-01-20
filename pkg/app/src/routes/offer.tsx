import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/offer")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh w-full flex-col p-6 md:p-10">
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Публичная оферта QuizGram</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              27.01.25 — на заключение договора оказания услуг по предоставлению доступа к
              программному обеспечению
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <p className="text-foreground leading-relaxed">
                Индивидуальный предприниматель Окрушко Василий Алексеевич, в дальнейшем именуемый
                «Исполнитель», действующий от своего имени, предлагает заключить любому физическому
                лицу, юридическому лицу или индивидуальному предпринимателю, именуемому в дальнейшем
                «Заказчик», а вместе именуемые «Стороны», договор оказания услуг по предоставлению
                доступа к программному обеспечению «QuizGram» (далее – Договор) на нижеследующих
                условиях:
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Термины и определения</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="font-medium text-foreground">Исполнитель</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — Индивидуальный предприниматель Окрушко Василий Алексеевич (ОГРНИП:
                    325774600846370), предоставляющий пользователям сайта услуги доступа к
                    программному обеспечению QuizGram.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Заказчик</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — пользователь Программного обеспечения QuizGram, заключивший с Исполнителем
                    договор на оказание услуг по предоставлению доступа к программному обеспечению.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Договор</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — договор на оказание услуг по предоставлению доступа к Программному
                    обеспечению, заключенный между Исполнителем и Заказчиком.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Программное обеспечение, ПО</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — программное обеспечение QuizGram, доступ к которому Исполнитель предоставляет
                    Заказчику в рамках настоящего Договора.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Сайт</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — сайт сервиса «QuizGram» в сети интернет, расположенный по адресу:
                    http://quizgram.site/
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Квиз</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — опросы, создаваемые с помощью Программного обеспечения и размещаемые на сайте
                    (сайтах) Заказчика, которые используются для уточнения потребностей
                    пользователей квиза, ознакомления пользователей с ассортиментом предлагаемых
                    Заказчиком товаров, работ, услуг, для получения контактной информации клиентов
                    или в иных информационных целях.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Пользователь Квиза</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — посетитель сайта (сайтов) Заказчика, использующий Квиз, созданный посредством
                    Программного обеспечения.
                  </dd>
                </div>
              </dl>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Преамбула</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  1.1. Исполнитель предлагает любому физическому лицу, юридическому лицу или
                  индивидуальному предпринимателю заключить Договор оказания услуг по предоставлению
                  доступа к программному обеспечению QuizGram на условиях, изложенных в настоящем
                  Договоре, с момента размещения текста Договора и информации об оказываемых услугах
                  на Сайте http://quizgram.site/
                </p>
                <p>
                  1.2. Акцепт оферты осуществляется путем совершения пользователем Сайта любого из
                  следующих действий:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>регистрация на Сайте</li>
                  <li>загрузка материалов</li>
                  <li>оплата Услуг Исполнителя</li>
                  <li>использование любых сервисов Сайта</li>
                </ul>
                <p>
                  1.3. Пользователь признается Заказчиком с момента совершения действий по акцепту
                  оферты.
                </p>
                <p>
                  1.4. Совершая акцепт, Заказчик подтверждает, что ознакомился с условиями Договора,
                  понял их и согласился соблюдать.
                </p>
                <p>
                  1.5. Исполнитель вправе изменять настоящий Договор. Новая редакция вступает в силу
                  с момента размещения на Сайте.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Предмет договора</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  2.1. Исполнитель обязуется оказать Заказчику услуги по предоставлению доступа к
                  Программному обеспечению QuizGram посредством Сайта, а Заказчик обязуется
                  оплачивать такие услуги.
                </p>
                <p>
                  2.2. Программное обеспечение QuizGram предоставляет Заказчику возможность
                  создавать и использовать квизы для взаимодействия с Пользователями Квизов,
                  получения информации и контактных данных.
                </p>
                <p>
                  2.3. Информация об Услугах и тарифах, размещенная на Сайте, является неотъемлемой
                  частью настоящего Договора.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. Гарантии и заверения</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  3.1. Стороны гарантируют, что обладают необходимыми правами и полномочиями для
                  заключения и исполнения настоящего Договора.
                </p>
                <p>
                  3.2. Заказчик гарантирует соблюдение требований законодательства Российской
                  Федерации, включая законодательство о персональных данных.
                </p>
                <p>
                  3.3. Исполнитель не гарантирует соответствие Программного обеспечения ожиданиям
                  Заказчика, а также его бесперебойную и безошибочную работу.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Обязательства сторон</h2>
              <div className="space-y-4 pl-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">4.1. Исполнитель вправе:</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>определять способы оказания Услуг</li>
                    <li>
                      приостанавливать оказание Услуг при нарушении Заказчиком условий Договора
                    </li>
                    <li>изменять тарифы и состав Услуг</li>
                    <li>проводить технические работы</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">4.2. Исполнитель обязан:</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>предоставить доступ к Программному обеспечению после оплаты Услуг</li>
                    <li>оказывать Услуги в соответствии с выбранным тарифом</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-2">4.3. Заказчик обязан:</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>оплачивать Услуги</li>
                    <li>не передавать доступ третьим лицам</li>
                    <li>соблюдать требования законодательства</li>
                    <li>самостоятельно отвечать за нарушения прав Пользователей Квизов</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Конфиденциальная информация</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  5.1. Стороны обязуются сохранять конфиденциальность информации, полученной при
                  исполнении настоящего Договора.
                </p>
                <p>
                  5.2. Конфиденциальная информация не подлежит разглашению, за исключением случаев,
                  предусмотренных законодательством.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">
                6. Порядок доступа к программному обеспечению
              </h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>6.1. Доступ предоставляется после регистрации Заказчика на Сайте.</p>
                <p>6.2. Заказчик несет ответственность за сохранность учетных данных.</p>
                <p>
                  6.3. Все действия, совершенные с использованием учетной записи Заказчика,
                  считаются совершенными самим Заказчиком.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Порядок оплаты</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>7.1. Стоимость Услуг определяется тарифами, размещенными на Сайте.</p>
                <p>7.2. Оплата производится на условиях 100% предоплаты.</p>
                <p>7.3. Возврат денежных средств не производится.</p>
                <p>
                  7.4. В случае если оплата Услуг осуществляется на условиях подписки (регулярных
                  списаний), такие отношения регулируются отдельным документом «Правила подписки»,
                  размещённым в свободном доступе на Сайте.
                </p>
                <p>
                  7.5. Оформляя подписку, Заказчик подтверждает, что ознакомился с условиями «Правил
                  подписки», понимает условия регулярных списаний, их размер и периодичность, а
                  также порядок отмены подписки.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. Ответственность</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  8.1. Исполнитель не несет ответственности за убытки Заказчика, возникшие в
                  результате использования или невозможности использования Программного обеспечения.
                </p>
                <p>
                  8.2. Ответственность Исполнителя ограничивается суммой, уплаченной Заказчиком за
                  Услуги.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">9. Электронный документооборот</h2>
              <p className="text-foreground leading-relaxed">
                9.1. Стороны признают юридическую силу электронных документов и электронной
                переписки.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">10. Заключительные положения</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>10.1. Настоящий Договор заключен на неопределенный срок.</p>
                <p>
                  10.2. Споры разрешаются путем переговоров, а при недостижении соглашения — в суде
                  по месту нахождения Исполнителя.
                </p>
                <p>
                  10.3. Заключая настоящий Договор, Заказчик выражает согласие на получение
                  информационных сообщений по электронной почте.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">11. Реквизиты Исполнителя</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>Индивидуальный предприниматель Окрушко Василий Алексеевич</p>
                <p>ИНН: 772607272115</p>
                <p>ОГРНИП: 325774600846370</p>
                <p>Расчётный счёт: 40802810620000846608</p>
                <p>Банк: ООО «Банк Точка»</p>
                <p>БИК: 044525104</p>
                <p>ИНН банка: 9721194461</p>
                <p>Корреспондентский счёт: 30101810745374525104</p>
                <p>E-mail: vasilijtigr4@gmail.com</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
