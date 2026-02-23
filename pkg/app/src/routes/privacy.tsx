import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/privacy')({
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
                Настоящая Политика конфиденциальности определяет порядок обработки и защиты
                информации, включая персональные данные пользователей сервиса QuizGram (далее —
                «Сервис»), представляющего собой программный продукт в формате Telegram Mini App, а
                также связанных с ним веб-ресурсов. Оператор стремится обеспечивать
                конфиденциальность и безопасность данных пользователей и обрабатывает персональные
                данные исключительно в соответствии с настоящей Политикой конфиденциальности и
                Пользовательским соглашением.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">1. ОПЕРАТОР ПЕРСОНАЛЬНЫХ ДАННЫХ</h2>
              <p className="text-foreground leading-relaxed">
                Оператором персональных данных является:
              </p>
              <div className="pl-4 space-y-2 text-foreground">
                <p>Индивидуальный предприниматель Окрушко Василий Алексеевич</p>
                <p>ИНН: 772607272115</p>
                <p>ОГРНИП: 325774600846370</p>
              </div>
              <div className="pl-4 space-y-1 text-foreground">
                <p className="font-medium">Юридический адрес:</p>
                <p>
                  109044, Российская Федерация, город Москва, внутригородская территория
                  муниципальный округ Южнопортовый, переулок 3-й Крутицкий, дом 11, помещение 7Н
                </p>
              </div>
              <p className="text-foreground italic">(далее — «Оператор»)</p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">2. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="font-medium text-foreground">Персональные данные</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — любая информация, относящаяся к прямо или косвенно определённому физическому
                    лицу.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Обработка персональных данных</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — любое действие или совокупность действий с персональными данными, включая
                    сбор, запись, систематизацию, хранение, использование, передачу, блокирование,
                    удаление и уничтожение.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Сервис (QuizGram)</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — программный комплекс в формате Telegram Mini App и связанных с ним технических
                    решений, позволяющий создавать интерактивные квизы, формы и сценарии сбора
                    данных.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Заказчик</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — зарегистрированный пользователь Сервиса, использующий его для создания квизов.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Пользователь квиза</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — физическое лицо, проходящее квиз, созданный Заказчиком, и предоставляющее
                    данные.
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-foreground">Квиз</dt>
                  <dd className="text-muted-foreground pl-4 mt-1">
                    — интерактивная форма, опрос или сценарий подбора/диагностики, создаваемые
                    Заказчиком в Сервисе QuizGram.
                  </dd>
                </div>
              </dl>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">3. РОЛИ И РАЗДЕЛЕНИЕ ОТВЕТСТВЕННОСТИ</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>3.1. Заказчик является оператором персональных данных Пользователей квизов.</p>
                <p>
                  3.2. QuizGram (Оператор) выступает обработчиком персональных данных Пользователей
                  квизов по поручению Заказчика и исключительно в целях обеспечения работы Сервиса.
                </p>
                <p>
                  3.3. Оператор не определяет цели и содержание обработки персональных данных
                  Пользователей квизов, за исключением технического обеспечения функционирования
                  Сервиса.
                </p>
                <p>
                  3.4. Ответственность за законность сбора, использование и дальнейшую обработку
                  персональных данных Пользователей квизов несёт Заказчик.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">4. ОБРАБАТЫВАЕМЫЕ ДАННЫЕ</h2>
              <div className="space-y-4 pl-4">
                <div>
                  <h3 className="font-medium text-foreground mb-2">4.1. Данные Заказчиков</h3>
                  <p className="text-foreground mb-2">
                    При регистрации и использовании Сервиса могут обрабатываться:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>адрес электронной почты</li>
                    <li>имя</li>
                    <li>номер телефона</li>
                    <li>Telegram ID</li>
                    <li>иные данные, добровольно указанные в личном кабинете</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">
                    4.2. Данные Пользователей квизов
                  </h3>
                  <p className="text-foreground mb-2">
                    Оператор обрабатывает любые данные, вводимые Пользователями квизов по инициативе
                    Заказчика, включая:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>имя</li>
                    <li>контактные данные</li>
                    <li>ответы на вопросы квиза</li>
                    <li>иные сведения, указанные Пользователем квиза</li>
                  </ul>
                  <p className="text-foreground mt-3 mb-2">
                    Запрещается использовать Сервис для сбора:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>биометрических персональных данных</li>
                    <li>
                      специальных категорий персональных данных (о расовой, национальной
                      принадлежности, политических взглядах, религиозных убеждениях, состоянии
                      здоровья, интимной жизни)
                    </li>
                    <li>данных банковских карт и иных платёжных средств</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">5. ЦЕЛИ ОБРАБОТКИ ПЕРСОНАЛЬНЫХ ДАННЫХ</h2>
              <p className="text-foreground leading-relaxed mb-3">
                Персональные данные обрабатываются в целях:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>предоставления доступа к Сервису QuizGram</li>
                <li>функционирования квизов, форм и CRM</li>
                <li>передачи данных Пользователей квизов Заказчикам</li>
                <li>коммуникации с Заказчиками</li>
                <li>аналитики, статистики и улучшения работы Сервиса</li>
                <li>исполнения договорных обязательств</li>
                <li>соблюдения требований законодательства</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">
                6. ИСПОЛЬЗОВАНИЕ АЛГОРИТМОВ И ИСКУССТВЕННОГО ИНТЕЛЛЕКТА
              </h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  6.1. В Сервисе могут применяться алгоритмы автоматического анализа данных и
                  рекомендации (AI) исключительно в вспомогательных и аналитических целях, включая:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>подсказки по структуре квизов</li>
                  <li>анализ ответов</li>
                  <li>рекомендации по повышению эффективности квизов</li>
                </ul>
                <p>
                  6.2. Алгоритмы AI не принимают юридически значимых решений и не заменяют человека.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">7. ТЕХНИЧЕСКИЕ ДАННЫЕ И TELEGRAM</h2>
              <p className="text-foreground leading-relaxed mb-3">
                При использовании Сервиса могут обрабатываться технические данные, включая:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>IP-адрес</li>
                <li>Telegram ID</li>
                <li>данные о взаимодействии с Mini App</li>
                <li>технические метаданные, необходимые для работы Сервиса</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-4">
                Данные используются исключительно для обеспечения функционирования и безопасности
                Сервиса.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">8. СРОКИ ХРАНЕНИЯ ДАННЫХ</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>
                  Персональные данные хранятся до достижения целей обработки либо до отзыва согласия
                  субъектом данных, но не более 3 (трёх) лет с момента последнего взаимодействия с
                  Сервисом, если иное не требуется законодательством.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">9. ПЕРЕДАЧА ПЕРСОНАЛЬНЫХ ДАННЫХ</h2>
              <div className="space-y-2 pl-4 text-foreground">
                <p>9.1. Персональные данные могут передаваться:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Заказчикам (владельцам квизов)</li>
                  <li>техническим подрядчикам и дата-центрам</li>
                  <li>уполномоченным государственным органам в случаях, предусмотренных законом</li>
                </ul>
                <p className="mt-3">
                  9.2. Оператор не продаёт и не передаёт персональные данные третьим лицам для
                  самостоятельного использования.
                </p>
              </div>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">10. ПРАВА СУБЪЕКТОВ ПЕРСОНАЛЬНЫХ ДАННЫХ</h2>
              <p className="text-foreground leading-relaxed mb-3">
                Субъект персональных данных имеет право:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>получить информацию о своих данных</li>
                <li>потребовать уточнение или исправление данных</li>
                <li>потребовать удаление данных</li>
                <li>отозвать согласие на обработку данных</li>
              </ul>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">11. БЕЗОПАСНОСТЬ ДАННЫХ</h2>
              <p className="text-foreground leading-relaxed">
                Оператор применяет необходимые организационные и технические меры для защиты
                персональных данных от несанкционированного доступа, изменения, утраты или
                распространения.
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">12. ОБНОВЛЕНИЕ ПОЛИТИКИ КОНФИДЕНЦИАЛЬНОСТИ</h2>
              <p className="text-foreground leading-relaxed">
                Оператор вправе вносить изменения в настоящую Политику конфиденциальности.
                Актуальная версия Политики всегда доступна в Сервисе QuizGram.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
