// Сервис для работы с кодами (верификация, сброс пароля и т.д.)
// Работает с базой данных через Drizzle ORM

import { and, eq, lt, or } from 'drizzle-orm';
import { codeTable, db, type Code, type NewCode } from '../db';

export type CodeType = 'reset_password' | 'change_email' | 'registration' | 'confirm_auth';

export abstract class CodeService {
  /**
   * Генерация кода для авторизованного пользователя
   * Если код уже существует и не истёк - возвращает существующий
   * Если код истёк - генерирует новый
   */
  static async generateCodeByAuthUser(type: CodeType, userId: number): Promise<Code> {
    // Очищаем истёкшие коды перед генерацией нового
    await this.cleanupExpiredCodes(userId, type);

    // Ищем существующий код
    const existingCodes = await db
      .select()
      .from(codeTable)
      .where(and(eq(codeTable.type, type), eq(codeTable.userId, userId), eq(codeTable.isActive, true)))
      .limit(1);

    const existingCode = existingCodes[0];

    // Если код существует и ещё не истёк - возвращаем его
    if (existingCode && new Date(existingCode.life) > new Date()) {
      return existingCode;
    }

    // Если код истёк или не существует - создаём новый
    // Генерируем 6-значный цифровой код
    const codeValue = Math.floor(100000 + Math.random() * 900000).toString();
    const newCode: NewCode = {
      type,
      userId,
      value: codeValue,
      life: new Date(Date.now() + 15 * 60 * 1000), // 15 минут
      nextMailSendAvailable: new Date(),
      isActive: true,
    };

    if (existingCode) {
      // Обновляем существующий истёкший код
      const [updatedCode] = await db
        .update(codeTable)
        .set({
          value: newCode.value,
          life: newCode.life,
          nextMailSendAvailable: newCode.nextMailSendAvailable,
          isActive: true,
        })
        .where(eq(codeTable.id, existingCode.id))
        .returning();

      return updatedCode;
    } else {
      // Создаём новый код
      const [createdCode] = await db.insert(codeTable).values(newCode).returning();

      return createdCode;
    }
  }

  /**
   * Генерация кода по email
   */
  static async generateCodeByEmail(type: CodeType, email: string): Promise<Code> {
    // Сначала нужно найти пользователя по email
    const { UserTable: userTable } = await import('../db');
    const users = await db.select().from(userTable).where(eq(userTable.login, email)).limit(1);

    const user = users[0];
    if (!user) {
      throw new Error('User not found');
    }

    return this.generateCodeByAuthUser(type, user.id);
  }

  /**
   * Поиск кода по значению, типу и пользователю
   */
  static async findCode(code: string, codeType: CodeType, userId: number): Promise<Code | null> {
    const codes = await db
      .select()
      .from(codeTable)
      .where(and(eq(codeTable.value, code), eq(codeTable.type, codeType), eq(codeTable.userId, userId), eq(codeTable.isActive, true)))
      .limit(1);

    return codes[0] ?? null;
  }

  /**
   * Очистка истёкших кодов для конкретного пользователя и типа
   */
  static async cleanupExpiredCodes(userId: number, codeType: CodeType): Promise<void> {
    await db
      .update(codeTable)
      .set({ isActive: false })
      .where(and(eq(codeTable.userId, userId), eq(codeTable.type, codeType), or(lt(codeTable.life, new Date()), eq(codeTable.isActive, false))));
  }

  /**
   * Глобальная очистка всех истёкших кодов
   */
  static async globalCleanupExpiredCodes(): Promise<number> {
    const result = await db
      .update(codeTable)
      .set({ isActive: false })
      .where(or(lt(codeTable.life, new Date()), eq(codeTable.isActive, false)))
      .returning();

    return result.length;
  }
}
