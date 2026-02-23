// Сервис для работы с файлами квиза
// Обрабатывает загрузку в S3 и сохранение в БД без требования userId

import { and, eq } from 'drizzle-orm';
import { db, type NewQuizFile, quizFileTable } from '../db';
import { validatePublicFileTypeAndSize } from '../helpers/file.helper';
import { logger } from '../lib/logger';
import { S3Service, type UploadResult } from './s3.service';

export abstract class QuizFileService {
  /**
   * Определение папки в S3 для файлов квиза
   */
  private static getQuizFolder(): string {
    return 'quiz-files';
  }

  /**
   * Загрузка файла квиза: валидация и загрузка в S3
   * @param file - файл (Blob, File или Buffer)
   * @param quizId - ID квиза
   * @param sessionKey - ключ сессии пользователя
   * @param content
   * @returns Результат загрузки
   */
  static async uploadQuizFile(
    file: File,
    quizId: number,
    sessionKey: string,
    content: {
      manyFiles: boolean;
      required: boolean;
      title: string;
      type: 'all' | 'image' | 'docs' | 'video';
    }
  ): Promise<UploadResult> {
    const fileName = file.name;
    const fileSize = file.size;
    const contentType = file.type;

    if (!content?.type) throw new Error('File not supported type' + JSON.stringify(content));

    // Проверяем тип и размер файла
    const validation = validatePublicFileTypeAndSize(contentType, fileSize, content.type);
    if (validation.error) {
      logger.error('Ошибка валидации файла квиза', validation.error, {
        fileName,
        contentType,
        fileSize,
        error: validation,
      });
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
        'Ошибка при загрузке файла квиза в S3',
        error instanceof Error ? error : new Error(String(error)),
        { fileName, folder }
      );
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`failed to upload quiz file: ${errorMessage}`);
    }

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
          'Ошибка при удалении файла квиза из S3 после ошибки БД',
          deleteError instanceof Error ? deleteError : new Error(String(deleteError)),
          { fileKey: uploadResult.fileKey }
        );
      }
      logger.error('Ошибка сохранения информации о файле квиза в БД', error as Error);
      throw new Error(
        `failed to save file info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
      .where(and(eq(quizFileTable.fileUrl, fileUrl), eq(quizFileTable.sessionKey, sessionKey)))
      .limit(1);

    const file = files[0];
    if (!file) {
      throw new Error('File not found or access denied');
    }

    // Удаляем из БД
    await db.delete(quizFileTable).where(eq(quizFileTable.id, file.id));

    // Удаляем из S3
    try {
      await S3Service.deleteFile(file.fileKey);
    } catch (error) {
      logger.error(
        'Ошибка при удалении файла квиза из S3',
        error instanceof Error ? error : new Error(String(error)),
        { fileKey: file.fileKey, sessionKey }
      );
      // Не прерываем процесс, если не удалось удалить из S3
      // Файл уже удален из БД
    }
  }
}
