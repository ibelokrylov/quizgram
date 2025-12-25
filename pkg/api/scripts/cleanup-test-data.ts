// Скрипт для очистки тестовых данных из БД
// Удаляет всех пользователей с login, начинающимся с 'test-'
// и все связанные с ними данные

import { cleanupAllTestUsers } from "../test/utils/test-db";

async function main() {
  console.log("Начинаю очистку тестовых данных...");
  
  try {
    await cleanupAllTestUsers();
    console.log("✅ Очистка тестовых данных завершена успешно");
    process.exit(0);
  } catch (error) {
    console.error("❌ Ошибка при очистке тестовых данных:", error);
    process.exit(1);
  }
}

main();

