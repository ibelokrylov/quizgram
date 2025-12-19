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
}
