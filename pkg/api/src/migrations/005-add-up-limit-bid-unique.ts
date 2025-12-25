import type { MigrationFile } from "./types";

export const migration: MigrationFile = {
  name: "005-add-up-limit-bid-unique",
  description: "Добавляет UNIQUE constraint на поле bid в таблице up_limit, предварительно удалив дубликаты",
  async up(sql) {
    // Сначала удаляем дубликаты, оставляя записи с минимальным id для каждого bid
    await sql`
      DELETE FROM up_limit 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM up_limit 
        GROUP BY bid
      );
    `;

    // Добавляем UNIQUE constraint на поле bid (если еще не существует)
    // Проверяем существование constraint перед добавлением
    const constraintExists = await sql`
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE table_name = 'up_limit' 
        AND constraint_name = 'up_limit_bid_unique'
        AND constraint_type = 'UNIQUE'
    `;

    if (constraintExists.length === 0) {
      await sql`
        ALTER TABLE up_limit 
        ADD CONSTRAINT up_limit_bid_unique UNIQUE (bid);
      `;
    }
  },
};

