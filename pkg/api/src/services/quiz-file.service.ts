// Сервис для работы с файлами квиза
// Обрабатывает загрузку в S3 и сохранение в БД без требования userId

import { and, eq } from "drizzle-orm";
import { db, quizFileTable, type NewQuizFile } from "../db";
import { validateFileTypeAndSize } from "../helpers/file.helper";
import { logger } from "../lib/logger";
import { S3Service, type UploadResult } from "./s3.service";

export abstract class QuizFileService {
  /**
   * Определение папки в S3 для файлов квиза
   */
  private static getQuizFolder(): string {
    return "quiz-files";
  }

  /**
   * Загрузка файла квиза: валидация и загрузка в S3
   * @param file - файл (Blob, File или Buffer)
   * @param quizId - ID квиза
   * @param sessionKey - ключ сессии пользователя
   * @returns Результат загрузки
   */
  static async uploadQuizFile(
    file: Blob | File | Buffer | Uint8Array,
    quizId: number,
    sessionKey: string
  ): Promise<UploadResult> {
    // Определяем свойства файла
    let fileName: string;
    let fileSize: number;
    let contentType: string;

    if (file instanceof File) {
      fileName = file.name;
      fileSize = file.size;
      contentType = file.type;
    } else if (file instanceof Blob) {
      // Для Blob генерируем имя и используем size
      fileName = `file-${Date.now()}`;
      fileSize = file.size;
      contentType = file.type || 'application/octet-stream';
    } else {
      // Для Buffer/Uint8Array генерируем имя и определяем размер
      fileName = `file-${Date.now()}`;
      fileSize = file.length;
      contentType = 'application/octet-stream';
    }

    // Проверяем тип и размер файла
    const validation = validateFileTypeAndSize(contentType, fileSize);
    if (validation.error) {
      logger.error(
        "Ошибка валидации файла квиза",
        validation.error,
        { fileName, contentType, fileSize },
      );
      throw new Error(`file validation failed: ${validation.error.message}`);
    }

    // Определяем папку для файлов квиза
    const folder = this.getQuizFolder();

    // Загружаем файл в S3
    let uploadResult: UploadResult;
    try {
      uploadResult = await S3Service.uploadFile(file, fileName, folder);
    } catch (error) {
      logger.error(
        "Ошибка при загрузке файла квиза в S3",
        error instanceof Error ? error : new Error(String(error)),
        { fileName, folder },
      );
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`failed to upload quiz file: ${errorMessage}`);
    }

    logger.info("Файл квиза успешно загружен", {
      fileName,
      fileKey: uploadResult.fileKey,
      fileURL: uploadResult.fileURL,
      folder,
      quizId,
      sessionKey,
    });

    // Сохраняем информацию о файле в БД
    try {
      const newFile: NewQuizFile = {
        uid: crypto.randomUUID(),
        quizId,
        fileName,
        fileKey: uploadResult.fileKey,
        fileUrl: uploadResult.fileURL,
        fileSize,
        fileType: contentType,
        sessionKey,
      };

      await db.insert(quizFileTable).values(newFile);
    } catch (error) {
      // Если не удалось сохранить в БД, удаляем файл из S3
      try {
        await S3Service.deleteFile(uploadResult.fileKey);
      } catch (deleteError) {
        logger.error(
          "Ошибка при удалении файла квиза из S3 после ошибки БД",
          deleteError instanceof Error ? deleteError : new Error(String(deleteError)),
          { fileKey: uploadResult.fileKey },
        );
      }
      logger.error("Ошибка сохранения информации о файле квиза в БД", error as Error);
      throw new Error(`failed to save file info: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return uploadResult;
  }

  /**
   * Удаление файла квиза: удаление из БД и S3
   * @param fileUrl - URL файла
   * @param sessionKey - ключ сессии пользователя
   */
  static async deleteQuizFile(fileUrl: string, sessionKey: string): Promise<void> {
    // Находим файл в БД
    const files = await db
      .select()
      .from(quizFileTable)
      .where(
        and(
          eq(quizFileTable.fileUrl, fileUrl),
          eq(quizFileTable.sessionKey, sessionKey)
        )
      )
      .limit(1);

    const file = files[0];
    if (!file) {
      throw new Error("File not found or access denied");
    }

    // Удаляем из БД
    await db.delete(quizFileTable).where(
      eq(quizFileTable.id, file.id)
    );

    // Удаляем из S3
    try {
      await S3Service.deleteFile(file.fileKey);
    } catch (error) {
      logger.error(
        "Ошибка при удалении файла квиза из S3",
        error instanceof Error ? error : new Error(String(error)),
        { fileKey: file.fileKey, sessionKey },
      );
      // Не прерываем процесс, если не удалось удалить из S3
      // Файл уже удален из БД
    }
  }
}