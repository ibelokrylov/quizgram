import { t } from "elysia";

// Модель для фильтров при получении списка заявок
export const bidsListFilters = t.Object({
  quiz_uid: t.Optional(t.String()),
  status: t.Optional(t.String()),
  isFull: t.Optional(t.Boolean()),
  isRead: t.Optional(t.Boolean()), // Фильтр по прочитанным/новым заявкам
  limit: t.Optional(t.Numeric({ default: 10, minimum: 1, maximum: 10 })),
  offset: t.Optional(t.Numeric({ default: 0, minimum: 0 })),
});

export type BidsListFilters = typeof bidsListFilters.static;

// Модель для ответа со списком заявок
export const bidListItem = t.Object({
  uid: t.String(), // UUID квиза
  key: t.String(),
  status: t.String(),
  isFull: t.Boolean(),
  isRead: t.Boolean(), // Прочитана ли заявка
  first: t.Boolean(), // Первый ли это запрос квиза
  createdAt: t.String(),
  updatedAt: t.String(),
  adminUpdatedAt: t.Optional(t.Nullable(t.String())), // Дата обновления администратором
  quizName: t.String(), // Добавляем имя квиза для отображения
  contacts: t.Optional(t.Nullable(t.Any())), // Контакты из info.contacts
  ipLocation: t.Optional(t.Nullable(t.Object({
    country: t.Nullable(t.String()),
    city: t.Nullable(t.String()),
    ip: t.Nullable(t.String()),
  }))), // Геолокация по IP
  info: t.Optional(t.Nullable(t.Any())), // Дополнительная информация из таблицы quiz_bid (только для planId != 1)
});

export type BidListItem = typeof bidListItem.static;

// Модель для списка заявок с пагинацией (внутренняя структура)
export const bidsListData = t.Object({
  data: t.Array(bidListItem),
  total: t.Number(), // Количество isFull = true
  totalNotFull: t.Optional(t.Number()), // Количество isFull = false (не возвращается для FREE плана)
  hasMore: t.Boolean(),
  hasMoreBeyondLimit: t.Optional(t.Boolean()), // Есть ли заявки сверх лимита
  beyondLimitCount: t.Number(), // Количество заявок, которые не влезли из-за лимита тарифного плана
  maxAvailableFull: t.Number(), // Количество доступных заявок с isFull = true в пределах лимита тарифного плана
  deletedInLimitFull: t.Number(), // Количество удаленных заявок с isFull = true, которые влезли в лимит
});

export type BidsListData = typeof bidsListData.static;

// Модель для ответа со списком заявок (с оберткой message/data)
export const bidsListResponse = t.Object({
  message: t.String(),
  data: bidsListData,
});

export type BidsListResponse = typeof bidsListResponse.static;

// Модель для обновления статуса заявки
export const updateBidStatus = t.Object({
  key: t.String(),
  status: t.String(),
});

export type UpdateBidStatus = typeof updateBidStatus.static;

// Модель для полной информации о заявке
export const bidDetails = t.Object({
  uid: t.String(),
  key: t.String(),
  status: t.String(),
  isFull: t.Boolean(),
  first: t.Boolean(), // Первый ли это запрос квиза
  createdAt: t.String(),
  updatedAt: t.String(),
  adminUpdatedAt: t.Optional(t.Nullable(t.String())), // Дата обновления администратором
  quizName: t.String(),
  data: t.Any(), // Полные данные заявки (ответы, контакты и т.д.) - поле answer из таблицы
  info: t.Optional(t.Nullable(t.Any())), // Дополнительная информация (контакты и т.д.)
  questions: t.Optional(t.Nullable(t.Any())), // Вопросы квиза
  contacts: t.Optional(t.Nullable(t.Any())), // Ответы пользователя на форму контактов
  contactsForm: t.Optional(t.Nullable(t.Any())), // Форма контактов из квиза
  userInfo: t.Optional(t.Nullable(t.Any())), // Информация о пользователе из Telegram
  initData: t.Optional(t.Nullable(t.String())), // Telegram WebApp initData как строка
});


export type BidDetails = typeof bidDetails.static;

// Модели для namespace BidsModel
export namespace BidsModel {
  // Ответы для получения списка заявок
  export const getBidsErrorResponse = t.Object({
    message: t.String(),
    error: t.String(),
  });

  export type getBidsErrorResponse = typeof getBidsErrorResponse.static;

  // Ответы для обновления статуса
  export const updateBidStatusSuccessResponse = t.Object({
    message: t.String(),
    data: t.Object({
      success: t.Boolean(),
    }),
  });

  export type updateBidStatusSuccessResponse = typeof updateBidStatusSuccessResponse.static;

  export const updateBidStatusErrorResponse = t.Object({
    message: t.String(),
    error: t.String(),
  });

  export type updateBidStatusErrorResponse = typeof updateBidStatusErrorResponse.static;

  // Ответы для получения деталей заявки
  export const getBidDetailsSuccessResponse = t.Object({
    message: t.String(),
    data: bidDetails,
  });

  export type getBidDetailsSuccessResponse = typeof getBidDetailsSuccessResponse.static;

  export const getBidDetailsErrorResponse = t.Object({
    message: t.String(),
    error: t.String(),
  });

  export type getBidDetailsErrorResponse = typeof getBidDetailsErrorResponse.static;

  // Ответы для удаления заявки
  export const deleteBidSuccessResponse = t.Object({
    message: t.String(),
    data: t.Object({
      success: t.Boolean(),
    }),
  });

  export type deleteBidSuccessResponse = typeof deleteBidSuccessResponse.static;

  export const deleteBidErrorResponse = t.Object({
    message: t.String(),
    error: t.String(),
  });

  export type deleteBidErrorResponse = typeof deleteBidErrorResponse.static;
}