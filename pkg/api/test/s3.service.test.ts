// Тесты для S3Service

import { afterAll, beforeAll, expect, test } from "bun:test";
import { S3Service, type UploadResult } from "../src/services/s3.service";

// Переменные окружения для тестов должны быть установлены
// В реальных тестах можно использовать тестовый S3 bucket или моки
const TEST_FOLDER = "test-uploads";

// Список файлов, созданных в тестах, для последующего удаления
const createdFiles: string[] = [];

/**
 * Очистка созданных файлов после тестов
 */
async function cleanupTestFiles() {
  for (const fileKey of createdFiles) {
    try {
      await S3Service.deleteFile(fileKey);
    } catch (error) {
      // Игнорируем ошибки при удалении (файл может уже не существовать)
      console.warn(`Не удалось удалить тестовый файл ${fileKey}:`, error);
    }
  }
  createdFiles.length = 0;
}

beforeAll(async () => {
  // Проверяем наличие необходимых переменных окружения
  const requiredEnvVars = [
    "S3_ACCESS_KEY",
    "S3_SECRET_ACCESS_KEY",
    "S3_BUCKET_NAME",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName] && !(typeof Bun !== "undefined" && Bun.env[varName]),
  );

  if (missingVars.length > 0) {
    console.warn(
      `⚠️  Предупреждение: Отсутствуют переменные окружения для S3: ${missingVars.join(", ")}`,
    );
    console.warn("Тесты S3Service будут пропущены, если переменные не установлены");
  }
});

afterAll(async () => {
  // Удаляем все созданные файлы
  await cleanupTestFiles();
});

test("1. Загрузка файла в S3 (Buffer)", async () => {
  // Пропускаем тест, если нет переменных окружения
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  const testContent = "Тестовое содержимое файла";
  const buffer = Buffer.from(testContent, "utf-8");
  const originalFileName = "test-file.txt";

  const result: UploadResult = await S3Service.uploadFile(
    buffer,
    originalFileName,
    TEST_FOLDER,
  );

  // Сохраняем fileKey для последующего удаления
  createdFiles.push(result.fileKey);

  expect(result).toBeDefined();
  expect(result.fileName).toMatch(/^[0-9a-f-]+\.txt$/);
  expect(result.fileKey).toBe(`${TEST_FOLDER}/${result.fileName}`);
  expect(result.fileURL).toContain(result.fileKey);
});

test("2. Загрузка файла в S3 (Blob)", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  const testContent = "Тестовое содержимое Blob";
  const blob = new Blob([testContent], { type: "text/plain" });
  const originalFileName = "test-blob.txt";

  const result: UploadResult = await S3Service.uploadFile(
    blob,
    originalFileName,
    TEST_FOLDER,
  );

  createdFiles.push(result.fileKey);

  expect(result).toBeDefined();
  expect(result.fileName).toMatch(/^[0-9a-f-]+\.txt$/);
  expect(result.fileKey).toBe(`${TEST_FOLDER}/${result.fileName}`);
});

test("3. Загрузка файла в S3 (Uint8Array)", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  const testContent = "Тестовое содержимое Uint8Array";
  const uint8Array = new TextEncoder().encode(testContent);
  const originalFileName = "test-uint8.txt";

  const result: UploadResult = await S3Service.uploadFile(
    uint8Array,
    originalFileName,
    TEST_FOLDER,
  );

  createdFiles.push(result.fileKey);

  expect(result).toBeDefined();
  expect(result.fileName).toMatch(/^[0-9a-f-]+\.txt$/);
  expect(result.fileKey).toBe(`${TEST_FOLDER}/${result.fileName}`);
});

test("4. Загрузка файла без папки", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  const testContent = "Файл в корне бакета";
  const buffer = Buffer.from(testContent, "utf-8");
  const originalFileName = "root-file.txt";

  const result: UploadResult = await S3Service.uploadFile(
    buffer,
    originalFileName,
  );

  createdFiles.push(result.fileKey);

  expect(result).toBeDefined();
  expect(result.fileKey).toBe(result.fileName);
  expect(result.fileKey).not.toContain("/");
});

test("5. Получение файла из S3", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  // Сначала загружаем файл
  const testContent = "Содержимое для чтения";
  const buffer = Buffer.from(testContent, "utf-8");
  const originalFileName = "read-test.txt";

  const uploadResult: UploadResult = await S3Service.uploadFile(
    buffer,
    originalFileName,
    TEST_FOLDER,
  );

  createdFiles.push(uploadResult.fileKey);

  // Затем читаем его
  const downloadedBuffer = await S3Service.getFile(uploadResult.fileKey);
  const downloadedContent = downloadedBuffer.toString("utf-8");

  expect(downloadedContent).toBe(testContent);
  expect(downloadedBuffer.length).toBe(buffer.length);
});

test("6. Получение несуществующего файла должно выбрасывать ошибку", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  const nonExistentKey = `${TEST_FOLDER}/non-existent-${Date.now()}.txt`;

  await expect(S3Service.getFile(nonExistentKey)).rejects.toThrow();
});

test("7. Генерация presigned URL", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  // Загружаем файл
  const testContent = "Файл для presigned URL";
  const buffer = Buffer.from(testContent, "utf-8");
  const originalFileName = "presigned-test.txt";

  const uploadResult: UploadResult = await S3Service.uploadFile(
    buffer,
    originalFileName,
    TEST_FOLDER,
  );

  createdFiles.push(uploadResult.fileKey);

  // Генерируем presigned URL
  const presignedURL = await S3Service.getPresignedURL(
    uploadResult.fileKey,
    3600, // 1 час
  );

  expect(presignedURL).toBeDefined();
  expect(presignedURL).toMatch(/^https?:\/\//); // Может быть http:// или https://
  expect(presignedURL).toContain(uploadResult.fileKey);
});

test("8. Генерация presigned URL с максимальным временем жизни", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  // Загружаем файл
  const testContent = "Файл для максимального presigned URL";
  const buffer = Buffer.from(testContent, "utf-8");
  const originalFileName = "max-presigned-test.txt";

  const uploadResult: UploadResult = await S3Service.uploadFile(
    buffer,
    originalFileName,
    TEST_FOLDER,
  );

  createdFiles.push(uploadResult.fileKey);

  // Генерируем presigned URL с временем больше максимума (должно быть ограничено до 7 дней)
  const maxExpiration = 7 * 24 * 60 * 60; // 7 дней
  const requestedExpiration = maxExpiration + 1000; // Больше максимума

  const presignedURL = await S3Service.getPresignedURL(
    uploadResult.fileKey,
    requestedExpiration,
  );

  expect(presignedURL).toBeDefined();
  expect(presignedURL).toMatch(/^https?:\/\//); // Может быть http:// или https://
});

test("9. Удаление файла из S3", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  // Загружаем файл
  const testContent = "Файл для удаления";
  const buffer = Buffer.from(testContent, "utf-8");
  const originalFileName = "delete-test.txt";

  const uploadResult: UploadResult = await S3Service.uploadFile(
    buffer,
    originalFileName,
    TEST_FOLDER,
  );

  // Удаляем файл
  await S3Service.deleteFile(uploadResult.fileKey);

  // Проверяем, что файл действительно удален
  await expect(S3Service.getFile(uploadResult.fileKey)).rejects.toThrow();

  // Не добавляем в createdFiles, так как уже удалили
});

test("10. Полный цикл: загрузка, чтение, удаление", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  const testContent = "Полный цикл тестирования";
  const buffer = Buffer.from(testContent, "utf-8");
  const originalFileName = "full-cycle-test.txt";

  // 1. Загрузка
  const uploadResult: UploadResult = await S3Service.uploadFile(
    buffer,
    originalFileName,
    TEST_FOLDER,
  );

  createdFiles.push(uploadResult.fileKey);

  expect(uploadResult).toBeDefined();
  expect(uploadResult.fileKey).toContain(TEST_FOLDER);

  // 2. Чтение
  const downloadedBuffer = await S3Service.getFile(uploadResult.fileKey);
  const downloadedContent = downloadedBuffer.toString("utf-8");
  expect(downloadedContent).toBe(testContent);

  // 3. Presigned URL
  const presignedURL = await S3Service.getPresignedURL(uploadResult.fileKey);
  expect(presignedURL).toBeDefined();

  // 4. Удаление
  await S3Service.deleteFile(uploadResult.fileKey);

  // Удаляем из списка, так как уже удалили
  const index = createdFiles.indexOf(uploadResult.fileKey);
  if (index > -1) {
    createdFiles.splice(index, 1);
  }

  // 5. Проверка удаления
  await expect(S3Service.getFile(uploadResult.fileKey)).rejects.toThrow();
});

test("11. Загрузка файла с разными расширениями", async () => {
  if (
    !process.env.S3_ACCESS_KEY &&
    !(typeof Bun !== "undefined" && Bun.env.S3_ACCESS_KEY)
  ) {
    console.log("⏭️  Пропущен: нет переменных окружения S3");
    return;
  }

  const extensions = [".txt", ".json", ".pdf", ".jpg", ".png", ""];

  for (const ext of extensions) {
    const testContent = `Тестовый файл с расширением ${ext}`;
    const buffer = Buffer.from(testContent, "utf-8");
    const originalFileName = `test${ext}`;

    const result: UploadResult = await S3Service.uploadFile(
      buffer,
      originalFileName,
      TEST_FOLDER,
    );

    createdFiles.push(result.fileKey);

    if (ext) {
      expect(result.fileName).toMatch(new RegExp(`^[0-9a-f-]+\\${ext}$`));
    } else {
      expect(result.fileName).toMatch(/^[0-9a-f-]+$/);
    }
  }
});

