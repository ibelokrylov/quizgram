// Сервис для работы с Telegram Crypto Pay API

import { logger } from "../lib/logger";

interface CreateInvoiceParams {
  amount: number; // Сумма в рублях (для RUB) или минимальных единицах для криптовалют
  currencyType?: "crypto" | "fiat"; // Тип валюты (по умолчанию "fiat")
  fiat?: string; // Фиатная валюта (по умолчанию "RUB")
  asset?: string; // Криптовалюта (по умолчанию "USDT")
  acceptedAssets?: string[]; // Список криптовалют для оплаты (по умолчанию ["USDT"])
  description?: string; // Описание платежа
}

interface CreateInvoiceResponse {
  ok: boolean;
  result?: {
    invoice_id: number;
    hash: string;
    asset: string;
    amount: string;
    paid_btn_name?: string;
    paid_btn_url?: string;
    pay_url: string;
    status: string;
    description?: string;
    created_at: number;
    usd_rate?: string;
    allow_comments?: boolean;
    allow_anonymous?: boolean;
    expiration_date?: number;
    paid_at?: number;
    paid_anon?: boolean;
    comment?: string;
    hidden_message?: string;
    payload?: string;
    paid_btn_name_used?: boolean;
    paid_btn_url_used?: boolean;
    invoice_url?: string;
  };
  error?: {
    code: number;
    name: string;
    message: string;
  };
}

interface GetInvoicesParams {
  asset?: string;
  invoice_ids?: number[];
  status?: "active" | "paid" | "expired";
  offset?: number;
  count?: number;
}

interface GetInvoicesResponse {
  ok: boolean;
  result?: {
    items: CreateInvoiceResponse["result"][];
    count: number;
  };
  error?: {
    code: number;
    name: string;
    message: string;
  };
}

export abstract class CryptoPayService {
  /**
   * Получает базовый URL в зависимости от окружения
   * Testnet: https://testnet-pay.crypt.bot/api (для dev)
   * Mainnet: https://pay.crypt.bot/api (для production)
   *
   * Согласно документации: URL должен быть в формате https://pay.crypt.bot/api/%method%
   * Версия API не указывается в URL
   */
  private static getBaseUrl(): string {
    const env = typeof Bun !== "undefined" ? Bun.env : process.env;
    const isDevelopment = env.ENV !== "production";

    if (isDevelopment) {
      // Testnet для dev окружения
      return "https://testnet-pay.crypt.bot/api";
    }

    // Mainnet для production
    return "https://pay.crypt.bot/api";
  }

  /**
   * Получает токен из переменных окружения
   */
  private static getToken(): string {
    const env = typeof Bun !== "undefined" ? Bun.env : process.env;
    const token = env.CRYPTO_PAY_TOKEN;

    if (!token) {
      logger.error(
        "CRYPTO_PAY_TOKEN не установлен в переменных окружения",
        new Error("Token missing"),
      );
      throw new Error("CRYPTO_PAY_TOKEN не установлен в переменных окружения");
    }

    // Убираем возможные пробелы и переносы строк
    const cleanToken = token.trim();

    if (cleanToken.length === 0) {
      logger.error(
        "CRYPTO_PAY_TOKEN пустой после очистки",
        new Error("Token empty"),
      );
      throw new Error("CRYPTO_PAY_TOKEN пустой");
    }

    return cleanToken;
  }

  /**
   * Выполняет запрос к Crypto Pay API
   */
  private static async makeRequest<T>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const token = this.getToken();
    const baseUrl = this.getBaseUrl();
    // Согласно документации: URL должен быть в формате https://pay.crypt.bot/api/%method%
    // Версия API не указывается в URL
    const url = `${baseUrl}/${method}`;

    const env = typeof Bun !== "undefined" ? Bun.env : process.env;
    const isDevelopment = env.ENV !== "production";

    // Логируем запрос (без токена для безопасности)
    logger.debug("Запрос к Crypto Pay API", {
      method,
      url,
      baseUrl,
      environment: isDevelopment ? "testnet (dev)" : "mainnet (production)",
      params,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 10) + "...",
    });

    try {
      // Telegram Crypto Pay API требует токен в заголовке Crypto-Pay-API-Token
      // Формат токена: {bot_id}:{secret_key}
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Crypto-Pay-API-Token": token,
        },
        body: JSON.stringify(params),
      });

      // Логируем детали ответа для отладки
      logger.debug("Ответ от Crypto Pay API", {
        method,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { raw: errorText };
        }

        logger.error(
          "Ошибка при запросе к Crypto Pay API",
          new Error(errorText),
          {
            method,
            url,
            status: response.status,
            statusText: response.statusText,
            errorText,
            errorData,
            tokenLength: token.length,
            tokenPrefix: token.substring(0, 10) + "...",
            requestParams: params,
          },
        );

        // Если это ошибка 401, добавляем более детальное сообщение
        if (response.status === 401) {
          throw new Error(
            `Crypto Pay API authentication failed (401). Проверьте правильность токена CRYPTO_PAY_TOKEN. ` +
              `Токен должен быть в формате {bot_id}:{secret_key}. ` +
              `Детали: ${errorData.error?.message || errorText}`,
          );
        }

        throw new Error(
          `Crypto Pay API error: ${response.status} ${response.statusText}. ${errorData.error?.message || errorText}`,
        );
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      logger.error(
        "Ошибка при выполнении запроса к Crypto Pay API",
        error instanceof Error ? error : new Error(String(error)),
        {
          method,
          params,
        },
      );
      throw error;
    }
  }

  /**
   * Создаёт инвойс для оплаты
   * @param params Параметры инвойса
   * @returns Данные созданного инвойса
   */
  static async createInvoice(
    params: CreateInvoiceParams,
  ): Promise<CreateInvoiceResponse["result"]> {
    const {
      amount,
      currencyType = "fiat",
      fiat = "RUB",
      asset = "USDT",
      acceptedAssets = ["USDT"],
      description,
    } = params;

    // Форматируем сумму для фиатной валюты
    // amount приходит в рублях (например, 1600 = 1600 рублей)
    const fiatAmount = amount.toFixed(2); // Форматируем с 2 знаками после запятой

    const requestParams: Record<string, unknown> = {
      currency_type: currencyType,
      amount: fiatAmount,
      description,
    };

    if (currencyType === "fiat") {
      // Для фиатной валюты указываем fiat и accepted_assets
      requestParams.fiat = fiat;
      requestParams.accepted_assets = acceptedAssets.join(",");
    } else {
      // Для криптовалюты указываем asset
      requestParams.asset = asset;
    }

    const response = await this.makeRequest<CreateInvoiceResponse>(
      "createInvoice",
      requestParams,
    );

    if (!response.ok || !response.result) {
      const errorMessage = response.error?.message || "Неизвестная ошибка";
      logger.error(
        "Ошибка при создании инвойса в Crypto Pay",
        new Error(errorMessage),
        {
          params,
          error: response.error,
        },
      );
      throw new Error(`Не удалось создать инвойс: ${errorMessage}`);
    }

    logger.info("Инвойс успешно создан в Crypto Pay", {
      invoiceId: response.result.invoice_id,
      amount: fiatAmount,
      currencyType,
      fiat: currencyType === "fiat" ? fiat : undefined,
      asset: currencyType === "crypto" ? asset : undefined,
      acceptedAssets: currencyType === "fiat" ? acceptedAssets : undefined,
    });

    return response.result;
  }

  /**
   * Получает информацию об инвойсе по ID
   * @param invoiceIds Массив ID инвойсов
   * @returns Данные инвойсов
   */
  static async getInvoices(
    params: GetInvoicesParams = {},
  ): Promise<GetInvoicesResponse["result"]> {
    const response = await this.makeRequest<GetInvoicesResponse>(
      "getInvoices",
      {
        asset: params.asset || "USDT",
        invoice_ids: params.invoice_ids,
        status: params.status,
        offset: params.offset,
        count: params.count || 100,
      },
    );

    if (!response.ok || !response.result) {
      const errorMessage = response.error?.message || "Неизвестная ошибка";
      logger.error(
        "Ошибка при получении инвойсов из Crypto Pay",
        new Error(errorMessage),
        {
          params,
          error: response.error,
        },
      );
      throw new Error(`Не удалось получить инвойсы: ${errorMessage}`);
    }

    return response.result;
  }

  /**
   * Проверяет статус инвойса
   * @param invoiceId ID инвойса
   * @returns Статус инвойса
   */
  static async checkInvoiceStatus(invoiceId: number): Promise<string | null> {
    try {
      const result = await this.getInvoices({
        invoice_ids: [invoiceId],
      });

      if (result && result.items.length > 0 && result.items[0]) {
        return result.items[0].status;
      }

      return null;
    } catch (error) {
      logger.error(
        "Ошибка при проверке статуса инвойса",
        error instanceof Error ? error : new Error(String(error)),
        {
          invoiceId,
        },
      );
      return null;
    }
  }
}
