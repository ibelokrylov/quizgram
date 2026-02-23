import type { MigrationFile } from './types';

export const migration: MigrationFile = {
  name: '006-fix-init-data-default',
  description: 'Исправление дефолтного значения init_data с пустой строки на NULL',
  async up(sql) {
    // Изменяем дефолтное значение init_data с '' на NULL
    await sql`
      ALTER TABLE quiz_bid 
      ALTER COLUMN init_data DROP DEFAULT,
      ALTER COLUMN init_data SET DEFAULT NULL;
    `;
  },
};
