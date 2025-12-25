// Сервис для работы с сессиями через JWT токены
// Использует библиотеку jose для прямой работы с JWT
// Аналог SessionService из Go API

import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = typeof Bun !== "undefined" ? Bun.env.JWT_SECRET : process.env.JWT_SECRET || "";

// Получаем секретный ключ для JWT
function getSecretKey(): Uint8Array {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(JWT_SECRET);
}

export interface UserSession {
  ID: number;
}

export interface BidSession {
  quizUIDs: string[];
}

// Тип для payload с обёрткой data
interface JWTPayload<T> {
  data: T;
}

export abstract class SessionService {
  /**
   * Генерация JWT токена для пользователя
   */
  static async generateSessionToken(userId: number): Promise<string> {
    const secretKey = getSecretKey();
    const payload: JWTPayload<UserSession> = { data: { ID: userId } };

    const token = await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d") // Токен действителен 30 дней
      .sign(secretKey);

    return token;
  }

  /**
   * Парсинг JWT токена и извлечение данных сессии
   */
  static async parseSessionToken(tokenString: string): Promise<UserSession> {
    const secretKey = getSecretKey();

    try {
      const { payload } = await jwtVerify(tokenString, secretKey, {
        algorithms: ["HS256"],
      });

      const decoded = payload as unknown as JWTPayload<UserSession>;

      if (!decoded || !decoded.data || !decoded.data.ID) {
        throw new Error("Invalid token structure");
      }

      return decoded.data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("expired") || error.message.includes("Expired") || error.message.includes("JWTExpired")) {
          throw new Error("Token has expired");
        }
        throw new Error(`Token parsing error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Генерация JWT токена для bid (с массивом quizUIDs)
   */
  static async generateBidToken(quizUIDs: string[]): Promise<string> {
    const secretKey = getSecretKey();
    const payload: JWTPayload<BidSession> = { data: { quizUIDs } };

    const token = await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Токен действителен 7 дней
      .sign(secretKey);

    return token;
  }

  /**
   * Добавление quizUID в существующий токен
   */
  static async addQuizUIDToToken(tokenString: string, quizUID: string): Promise<string> {
    const session = await this.parseBidToken(tokenString);

    // Проверяем, нет ли уже этого quizUID в массиве
    if (!session.quizUIDs.includes(quizUID)) {
      session.quizUIDs.push(quizUID);
    }

    return this.generateBidToken(session.quizUIDs);
  }

  /**
   * Парсинг JWT bid токена и извлечение данных сессии
   */
  static async parseBidToken(tokenString: string): Promise<BidSession> {
    const secretKey = getSecretKey();

    try {
      const { payload } = await jwtVerify(tokenString, secretKey, {
        algorithms: ["HS256"],
      });

      const decoded = payload as unknown as JWTPayload<BidSession>;

      if (!decoded || !decoded.data || !decoded.data.quizUIDs || !Array.isArray(decoded.data.quizUIDs)) {
        throw new Error("Invalid token structure");
      }

      return decoded.data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("expired") || error.message.includes("Expired") || error.message.includes("JWTExpired")) {
          throw new Error("Token has expired");
        }
        throw new Error(`Token parsing error: ${error.message}`);
      }
      throw error;
    }
  }
}
