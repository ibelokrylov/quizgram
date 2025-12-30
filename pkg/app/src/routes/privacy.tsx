import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh w-full flex-col p-6 md:p-10">
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Политика конфиденциальности</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Версия: 25.12.2025 г.</p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <p className="text-foreground leading-relaxed">
                В настоящей Политике конфиденциальности описаны правила обработки данных (в том
                числе персональных данных) пользователей сервиса «QuizGram», размещенного в сети
                Интернет и в формате Telegram Mini App (далее также – Сервис, Сервис «QuizGram»).
              </p>
              <p className="text-foreground leading-relaxed">
                Оператор стремится обеспечивать максимальную конфиденциальность данных своих
                пользователей. Оператор будет использовать данные пользователей только в
                соответствии с положениями Политики конфиденциальности и Пользовательского
                соглашения сервиса «QuizGram».
              </p>
            </section>

            <Separator />

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Оператор данных</h2>
              <p className="text-foreground leading-relaxed">Оператором ваших данных является:</p>
              <div className="pl-4 space-y-2 text-foreground">
                <p>Индивидуальный предприниматель Окрушко Василий Алексеевич</p>
                <p>ИНН: 772607272115</p>
                <p>ОГРНИП: 325774600846370</p>
              </div>
              <div className="pl-4 space-y-1 text-foreground">
                <p className="font-medium">Юридический адрес:</p>
                <p>
                  109044, Российская Федерация, город Москва,
                  <br />
                  внутригородская территория муниципальный округ Южнопортовый,
                  <br />
                  переулок 3-й Крутицкий, дом 11, помещение 7Н
                </p>
              </div>
              <p className="text-foreground italic">(далее – Оператор)</p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Термины и определения</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="font-medium text-foreground">Персональные данные</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — любая информация, относящаяся к прямо или косвенно определенному, или
                    определяемому физическому лицу (субъекту персональных данных).
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Обработка персональных данных</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — любое действие (операция) или совокупность действий (операций), совершаемых с
                    использованием средств автоматизации или без использования таких средств с
                    персональными данными, включая сбор, запись, систематизацию, накопление,
                    хранение, уточнение (обновление, изменение), извлечение, использование, передачу
                    (распространение, предоставление, доступ), обезличивание, блокирование,
                    удаление, уничтожение персональных данных.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Оператор персональных данных</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — физическое лицо, самостоятельно или совместно с другими лицами организующее и
                    (или) осуществляющее обработку персональных данных.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Обработчик персональных данных</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — лицо, осуществляющее обработку персональных данных в интересах и по поручению
                    оператора персональных данных.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Сервис, Сервис «QuizGram»</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — программный комплекс, в том числе в формате Telegram Mini App, позволяющий
                    пользователям создавать квизы для своих сайтов, сервисов и Telegram-проектов.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Квиз</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — маркетинговые опросы, создаваемые для уточнения потребностей клиентов
                    Заказчика и ознакомления их с ассортиментом товаров, работ, услуг, а также для
                    получения контактной информации клиентов.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Посетитель</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — лицо, посещающее сервис «QuizGram» без регистрации.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Заказчик</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — зарегистрированный пользователь Сервиса «QuizGram», использующий Сервис для
                    создания Квизов.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Сайт Заказчика</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — сайт, Telegram-канал, бот или иной цифровой ресурс, на котором Заказчик
                    размещает квиз, созданный посредством Сервиса «QuizGram».
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Пользователь квиза</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — физическое лицо, использующее Квиз, созданный Заказчиком посредством Сервиса
                    «QuizGram», и предоставляющее через Квиз свои данные.
                  </dd>
                </div>
              </dl>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. Обрабатываемые данные</h2>
              <p className="text-foreground leading-relaxed">
                При использовании Сервиса «QuizGram» Оператор может обрабатывать следующие данные:
              </p>

              <div className="space-y-4 pl-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">
                    1.1. При регистрации Заказчика:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>адрес электронной почты</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">
                    1.2. При заполнении личных данных Заказчиком:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>имя</li>
                    <li>адрес электронной почты</li>
                    <li>номер телефона</li>
                    <li>Telegram ID</li>
                    <li>должность</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">
                    1.3. При заполнении Квизов Пользователями квизов:
                  </h3>
                  <p className="text-foreground mb-2">
                    Любые данные, предоставляемые Пользователями квизов, включая:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>фамилию, имя, отчество</li>
                    <li>пол</li>
                    <li>возраст</li>
                    <li>дату рождения</li>
                    <li>адрес электронной почты</li>
                    <li>номер телефона</li>
                    <li>ID в социальных сетях</li>
                    <li>потребительские предпочтения</li>
                  </ul>
                  <p className="text-foreground mt-3 mb-2">за исключением:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>биометрических персональных данных</li>
                    <li>специальных персональных данных</li>
                    <li>данных о судимости</li>
                    <li>данных банковских карт и платёжных средств</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">
                    1.4. При использовании cookies и аналогичных технологий:
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>IP-адрес</li>
                    <li>cookies</li>
                    <li>данные об использовании Сервиса</li>
                    <li>информация о местоположении подключения</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. Цели и условия обработки данных</h2>
              <p className="text-foreground leading-relaxed mb-3">
                Оператор обрабатывает данные в целях:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>предоставления доступа к Сервису «QuizGram»</li>
                <li>оплаты услуг Сервиса</li>
                <li>направления информационных сообщений</li>
                <li>исполнения поручений Заказчиков</li>
                <li>коммуникации между Заказчиками и Пользователями квизов</li>
                <li>аналитики, маркетинговых и статистических исследований</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-4">
                Обработка осуществляется в автоматизированной форме и включает сбор, хранение,
                использование, передачу, блокирование и уничтожение данных.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. Файлы cookies</h2>
              <p className="text-foreground leading-relaxed mb-3">
                Сервис использует cookies и аналогичные технологии для:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>персонализации работы Сервиса</li>
                <li>аналитики и улучшения функционала</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-4">
                Пользователь может самостоятельно управлять настройками cookies в браузере или
                устройстве.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. Основания обработки данных</h2>
              <p className="text-foreground leading-relaxed mb-3">
                Обработка данных осуществляется на основании:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Пользовательского соглашения</li>
                <li>согласия субъекта персональных данных</li>
                <li>законных интересов Оператора</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. Передача данных третьим лицам</h2>
              <p className="text-foreground leading-relaxed mb-3">Данные могут передаваться:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Заказчикам</li>
                <li>техническим подрядчикам и дата-центрам</li>
                <li>операторам e-mail и аналитических сервисов</li>
                <li>государственным органам в случаях, предусмотренных законом</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-4 font-medium">
                Оператор не продаёт персональные данные.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">6. Права субъектов персональных данных</h2>
              <p className="text-foreground leading-relaxed mb-3">Пользователь имеет право:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>получить доступ к данным</li>
                <li>потребовать уточнение или удаление</li>
                <li>ограничить обработку</li>
                <li>отозвать согласие</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. Безопасность данных</h2>
              <p className="text-foreground leading-relaxed">
                Оператор принимает необходимые организационные и технические меры для защиты данных
                от несанкционированного доступа.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. Обновление политики</h2>
              <p className="text-foreground leading-relaxed">
                Оператор вправе вносить изменения в настоящую Политику конфиденциальности.
                Актуальная версия публикуется в Сервисе «QuizGram».
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
