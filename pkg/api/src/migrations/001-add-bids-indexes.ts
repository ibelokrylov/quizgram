// Миграция: Добавление индексов для оптимизации запросов к quiz_bid
// Дата создания: 2024
// Описание: Улучшение производительности запросов в модуле bids

import type { MigrationFile } from "./types";

export const migration: MigrationFile = {
  name: "001-add-bids-indexes",
  description: "Добавление индексов для оптимизации запросов к quiz_bid",

  async up(sql) {
    // Индекс для основных фильтров запросов
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_bid_user_filters 
      ON quiz_bid(quiz_id, is_full, is_read, status, deleted_at) 
      WHERE deleted_at IS NULL
    `;

    // Индекс для JOIN операций
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_bid_quiz_id 
      ON quiz_bid(quiz_id) 
      WHERE deleted_at IS NULL
    `;

    // Индекс для поиска по key
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_bid_key 
      ON quiz_bid(key) 
      WHERE deleted_at IS NULL
    `;

    // Индекс для сортировки по дате создания
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_bid_created_at 
      ON quiz_bid(created_at DESC) 
      WHERE deleted_at IS NULL
    `;

    // Составной индекс для фильтрации по is_full и is_equal_payment_limit
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_bid_full_payment 
      ON quiz_bid(is_full, is_equal_payment_limit) 
      WHERE deleted_at IS NULL AND is_full = true
    `;

    // Индекс для quiz таблицы по user_id
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_user_id 
      ON quiz(user_id)
    `;

    // Индекс для quiz таблицы по uid
    await sql`
      CREATE INDEX IF NOT EXISTS idx_quiz_uid 
      ON quiz(uid)
    `;
  },
};

