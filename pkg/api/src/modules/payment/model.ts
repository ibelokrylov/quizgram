// Модели валидации для модуля payment

import { t } from "elysia";

export namespace PaymentModel {
  // Успешный ответ при создании платежа
  export const createPaymentSuccessResponse = t.Object({
    message: t.String(),
    data: t.Object({
      paymentId: t.Number(),
      paymentUrl: t.String(),
      unitpayPaymentId: t.Optional(t.Number()),
      plan: t.Optional(
        t.Object({
          id: t.Number(),
          name: t.String(),
          price: t.Number(),
          bidMonthLimit: t.Number(),
        })
      ),
      upLimit: t.Optional(
        t.Object({
          id: t.Number(),
          bid: t.Number(),
          price: t.Number(),
        })
      ),
      totalAmount: t.Optional(t.Number()),
    }),
  });

  export type createPaymentSuccessResponse =
    typeof createPaymentSuccessResponse.static;

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
}
