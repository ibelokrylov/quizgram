import { t } from "elysia";

// Модель для фильтров при получении списка заявок
export const bidsListFilters = t.Object({
  quiz_uid: t.Optional(t.String()),
  status: t.Optional(t.String()),
  isFull: t.Optional(t.Boolean()),
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
  quizName: t.String(), // Добавляем имя квиза для отображения
  contacts: t.Optional(t.Nullable(t.Any())), // Контакты из info.contacts
  ipLocation: t.Optional(t.Nullable(t.Object({
    country: t.Nullable(t.String()),
    city: t.Nullable(t.String()),
    ip: t.Nullable(t.String()),
  }))), // Геолокация по IP
});

export type BidListItem = typeof bidListItem.static;

// Модель для списка заявок с пагинацией (внутренняя структура)
export const bidsListData = t.Object({
  data: t.Array(bidListItem),
  total: t.Number(), // Количество isFull = true
  totalNotFull: t.Number(), // Количество isFull = false
  hasMore: t.Boolean(),
  hasMoreBeyondLimit: t.Optional(t.Boolean()), // Есть ли заявки сверх лимита
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
  createdAt: t.String(),
  updatedAt: t.String(),
  quizName: t.String(),
  data: t.Any(), // Полные данные заявки (ответы, контакты и т.д.)
  info: t.Optional(t.Nullable(t.Any())), // Дополнительная информация (контакты и т.д.)
  questions: t.Optional(t.Nullable(t.Any())), // Вопросы квиза
  userInfo: t.Optional(t.Nullable(t.Any())), // Информация о пользователе из Telegram
  ipLocation: t.Optional(t.Nullable(t.Object({
    country: t.Nullable(t.String()),
    city: t.Nullable(t.String()),
    ip: t.Nullable(t.String()),
  }))), // Геолокация по IP
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
}