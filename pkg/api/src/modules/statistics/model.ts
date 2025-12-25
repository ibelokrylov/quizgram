import { t } from "elysia";

// Модели для валидации запросов статистики
export namespace StatisticsModel {
  // Параметры запроса для обеих статистик
  export const queryParams = t.Object({
    quiz_uid: t.String({
      description: "UID квиза для получения статистики",
      minLength: 1,
    }),
    start: t.Optional(
      t.String({
        description: "Дата начала периода (YYYY-MM-DD)",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      })
    ),
    end: t.Optional(
      t.String({
        description: "Дата окончания периода (YYYY-MM-DD)",
        pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      })
    ),
  });

  export type queryParams = typeof queryParams.static;

  // Ответ для общей статистики по дням
  export const dailyStatsResponse = t.Object({
    quiz_uid: t.String(),
    generated_at: t.String({
      description: "Дата и время создания отчета (ISO 8601)",
    }),
    ttl: t.Number({
      description: "Время жизни кеша в секундах",
    }),
    period: t.Object({
      start: t.String({
        description: "Дата начала периода (YYYY-MM-DD)",
      }),
      end: t.String({
        description: "Дата окончания периода (YYYY-MM-DD)",
      }),
    }),
    daily: t.Array(
      t.Object({
        date: t.String({
          description: "Дата (YYYY-MM-DD)",
        }),
        total_opens: t.Number({
          description: "Всего открытий за день",
        }),
        unique_opens: t.Number({
          description: "Уникальных открытий за день",
        }),
        repeated_opens: t.Number({
          description: "Неуникальных (повторных) открытий за день",
        }),
        completed: t.Number({
          description: "Пройденных квизов за день (isFull = true)",
        }),
        not_completed: t.Number({
          description: "Не пройденных квизов за день (isFull = false)",
        }),
      })
    ),
  });

  export type dailyStatsResponse = typeof dailyStatsResponse.static;

  // Ответ для статистики по незавершенным квизам
  export const abandonmentStatsResponse = t.Object({
    quiz_uid: t.String(),
    generated_at: t.String({
      description: "Дата и время создания отчета (ISO 8601)",
    }),
    ttl: t.Number({
      description: "Время жизни кеша в секундах",
    }),
    period: t.Object({
      start: t.String({
        description: "Дата начала периода (YYYY-MM-DD)",
      }),
      end: t.String({
        description: "Дата окончания периода (YYYY-MM-DD)",
      }),
    }),
    daily: t.Array(
      t.Object({
        date: t.String({
          description: "Дата (YYYY-MM-DD)",
        }),
        no_answers: t.Number({
          description: "Вышли не ответив ни на один вопрос",
        }),
        by_question: t.Array(
          t.Object({
            question_uid: t.String({
              description: "UID вопроса, на котором отвалился пользователь",
            }),
            question_number: t.Number({
              description: "Номер вопроса (начиная с 1)",
            }),
            question_title: t.Optional(t.String({
              description: "Название/заголовок вопроса",
            })),
            question_type: t.Optional(t.String({
              description: "Тип вопроса",
            })),
            count: t.Number({
              description: "Количество пользователей, отвалившихся на этом вопросе",
            }),
          })
        ),
        completed_no_contacts: t.Number({
          description: "Прошли опрос, но не заполнили контакты",
        }),
      })
    ),
  });

  export type abandonmentStatsResponse = typeof abandonmentStatsResponse.static;
}

