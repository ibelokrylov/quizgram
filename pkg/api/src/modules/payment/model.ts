// Модели валидации для модуля payment

import { t } from "elysia";

export namespace PaymentModel {
  // Успешный ответ при обновлении плана
  export const updatePlanSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Object({
      planId: t.Number(),
      planName: t.String(),
    }),
  });

  export type updatePlanSuccessResponse =
    typeof updatePlanSuccessResponse.static;

  // Ошибка при обновлении плана
  export const updatePlanErrorResponse = t.Object({
    message: t.String(), // "update-plan@error"
    error: t.Optional(t.String()),
  });

  export type updatePlanErrorResponse =
    typeof updatePlanErrorResponse.static;

  // Успешный ответ при создании платежа
  export const createPaymentSuccessResponse = t.Object({
    message: t.String(), // "ok"
    data: t.Object({
      paymentId: t.Number(),
      invoiceUrl: t.String(),
    }),
  });

  export type createPaymentSuccessResponse =
    typeof createPaymentSuccessResponse.static;

  // Ошибка при создании платежа
  export const createPaymentErrorResponse = t.Object({
    message: t.String(), // "create-payment@error"
    error: t.Optional(t.String()),
  });

  export type createPaymentErrorResponse =
    typeof createPaymentErrorResponse.static;

  // Webhook payload от Crypto Pay
  export const cryptoPayWebhookBody = t.Object({
    update_id: t.Number(),
    update_type: t.String(),
    request_date: t.Number(),
    payload: t.Object({
      invoice_id: t.Number(),
      hash: t.String(),
      asset: t.String(),
      amount: t.String(),
      paid_btn_name: t.Optional(t.String()),
      paid_btn_url: t.Optional(t.String()),
      status: t.String(),
      paid_at: t.Optional(t.Number()),
      usd_rate: t.Optional(t.String()),
      comment: t.Optional(t.String()),
      payload: t.Optional(t.String()),
    }),
  });

  export type cryptoPayWebhookBody =
    typeof cryptoPayWebhookBody.static;

  // Тело запроса для создания платежа Pro+ с дополнительными лимитами
  export const createPaymentProPlusBody = t.Object({
    upLimitId: t.Optional(t.Number()), // ID дополнительного лимита (обязателен для Pro+)
    payNow: t.Optional(t.Boolean()), // Оплата сейчас (true) или в день начала (false), по умолчанию true
  });

  export type createPaymentProPlusBody =
    typeof createPaymentProPlusBody.static;

  // Ответ со списком up_limits
  export const upLimitsResponse = t.Object({
    message: t.String(),
    data: t.Array(
      t.Object({
        id: t.Number(),
        bid: t.Number(),
        price: t.Number(),
      }),
    ),
  });

  export type upLimitsResponse = typeof upLimitsResponse.static;
}
