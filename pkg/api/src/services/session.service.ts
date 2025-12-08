// Сервис для работы с сессиями через JWT токены
// Аналог SessionService из Go API

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

export interface UserSession {
  ID: number;
}

export interface BidSession {
  quizUIDs: string[];
}

export abstract class SessionService {
  /**
   * Генерация JWT токена для пользователя
   */
  static generateSessionToken(userId: number): string {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not set");
    }

    const payload: UserSession = { ID: userId };
    const token = jwt.sign({ data: payload }, JWT_SECRET, {
      algorithm: "HS256",
    });

    return token;
  }

  /**
   * Парсинг JWT токена и извлечение данных сессии
   */
  static parseSessionToken(tokenString: string): UserSession {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not set");
    }

    try {
      const decoded = jwt.verify(tokenString, JWT_SECRET, {
        algorithms: ["HS256"],
      }) as { data: UserSession };

      if (!decoded.data || !decoded.data.ID) {
        throw new Error("Invalid token structure");
      }

      return decoded.data;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Token parsing error: ${error.message}`);
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("Token has expired");
      }
      throw error;
    }
  }

  /**
   * Генерация JWT токена для bid (с массивом quizUIDs)
   */
  static generateBidToken(quizUIDs: string[]): string {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not set");
    }

    const payload: BidSession = { quizUIDs };
    const token = jwt.sign({ data: payload }, JWT_SECRET, {
      algorithm: "HS256",
    });

    return token;
  }

  /**
   * Добавление quizUID в существующий токен
   */
  static addQuizUIDToToken(tokenString: string, quizUID: string): string {
    const session = this.parseBidToken(tokenString);

    // Проверяем, нет ли уже этого quizUID в массиве
    if (!session.quizUIDs.includes(quizUID)) {
      session.quizUIDs.push(quizUID);
    }

    return this.generateBidToken(session.quizUIDs);
  }

  /**
   * Парсинг JWT bid токена и извлечение данных сессии
   */
  static parseBidToken(tokenString: string): BidSession {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is not set");
    }

    try {
      const decoded = jwt.verify(tokenString, JWT_SECRET, {
        algorithms: ["HS256"],
      }) as { data: BidSession };

      if (!decoded.data || !decoded.data.quizUIDs || !Array.isArray(decoded.data.quizUIDs)) {
        throw new Error("Invalid token structure");
      }

      return decoded.data;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error(`Token parsing error: ${error.message}`);
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("Token has expired");
      }
      throw error;
    }
  }
}
