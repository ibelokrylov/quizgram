import type { MigrationFile } from './types';

export const migration: MigrationFile = {
  name: '007-add-quiz-is-show-logo',
  description: 'Добавление поля is_show_logo в таблицу quiz с дефолтным значением true',
  async up(sql) {
    // Добавляем поле is_show_logo с дефолтным значением true
    await sql`
      ALTER TABLE quiz 
      ADD COLUMN IF NOT EXISTS is_show_logo BOOLEAN NOT NULL DEFAULT true
    `;
  },
};
