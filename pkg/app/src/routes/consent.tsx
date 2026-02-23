import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/consent')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh w-full flex-col p-6 md:p-10">
      <div className="mx-auto w-full max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">
              Согласие на обработку персональных данных
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">Версия: 02.01.2026 г.</p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <p className="text-foreground leading-relaxed">
                Индивидуальный предприниматель Окрушко Василий Алексеевич (далее – «Оператор»)
                уведомляет, что является оператором ваших персональных данных и будет обрабатывать
                предоставленные персональные данные в соответствии с положениями Федерального закона
                Российской Федерации №152-ФЗ от 27.07.2006 «О персональных данных», Политики
                конфиденциальности и Договора оферты сервиса «QuizGram» (далее – Сервис, Сервис
                «QuizGram»).
              </p>
              <p className="text-foreground leading-relaxed">
                Настоящее согласие предоставляется путем заполнения «чек-бокса» (проставления
                «галочки» / «веб-метки» в графе «Согласен на обработку персональных данных и
                ознакомлен с условиями Политики конфиденциальности») и нажатия соответствующей
                кнопки.
              </p>
              <p className="text-foreground leading-relaxed">
                Заявление об отзыве настоящего согласия может быть направлено Оператору путем
                заполнения формы отзыва согласия, размещенного по следующей ссылке –
                <a href="/privacy" className="text-primary hover:underline ml-1">
                  https://app.quizgram.site/privacy
                </a>
                .
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Я выражаю свое согласие на обработку</h2>
              <p className="text-foreground leading-relaxed">
                Включая: сбор, запись, систематизацию, накопление, хранение, уточнение (обновление,
                изменение), извлечение, использование, передачу (предоставление, доступ),
                блокирование, обезличивание, удаление, уничтожение
              </p>
              <p className="text-foreground leading-relaxed">
                Своих персональных данных: любых предоставленных мной через «Квиз» данных, в том
                числе: фамилии, имени, отчества; пола; возраста; даты рождения; места рождения;
                гражданства; адреса проживания / регистрации; адреса электронной почты; номера
                телефона; ID в соцсетях; сведений о доходе; потребительских предпочтениях и других
                предоставленных мной самостоятельно данных
              </p>
              <p className="text-foreground leading-relaxed">
                Оператором: Индивидуальный предприниматель Окрушко Василий Алексеевич, ИНН:
                772607272115
              </p>
            </section>

            <Separator />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">В целях</h2>
              <p className="text-foreground leading-relaxed">
                Обеспечения коммуникации и взаимодействия между мной и создателями «Квизов»
                (Заказчиками), направления мне информационных и рекламных сообщений, продвижения
                товаров, работ, услуг партнеров Оператора (создателей «Квизов» – Заказчиков).
              </p>
              <p className="text-foreground leading-relaxed">
                Я согласен и разрешаю Оператору обрабатывать мои персональные данные с
                использованием средств автоматизации.
              </p>
              <p className="text-foreground leading-relaxed">
                Я согласен с тем, что мои персональные данные будут переданы третьим лицам –
                партнерам Оператора – создателям «Квизов» (Заказчикам), через которые я предоставляю
                свои данные, для реализации целей обработки персональных данных. Без передачи данных
                партнерам Оператора реализация целей обработки персональных данных будет невозможна.
              </p>
              <p className="text-foreground leading-relaxed">
                Я согласен с тем, что, если это необходимо для реализации целей обработки
                персональных данных, Оператор имеет право поручить обработку персональных данных.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
