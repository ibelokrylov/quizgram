// Типы для системы миграций

import type postgres from "postgres";

// Интерфейс миграции
export interface MigrationFile {
  // Уникальное имя миграции (например, "001-add-bids-indexes")
  name: string;
  
  // Описание миграции
  description: string;
  
  // Функция для выполнения миграции
  up: (sql: postgres.Sql) => Promise<void>;
}

// Статус миграции
export interface MigrationStatus {
  name: string;
  description: string;
  executed: boolean;
  executedAt?: Date;
}

