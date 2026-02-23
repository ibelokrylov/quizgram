// Централизованный список всех миграций
// Миграции выполняются в порядке добавления в этот массив

import type { MigrationFile } from './types';
import { migration as migration001 } from './001-add-bids-indexes';
import { migration as migration002 } from './002-add-user-payment-is-active';
import { migration as migration003 } from './003-fix-user-payment-final-day';
import { migration as migration004 } from './004-add-payment-attempts';
import { migration as migration005 } from './005-add-up-limit-bid-unique';
import { migration as migration006 } from './006-fix-init-data-default';
import { migration as migration007 } from './007-add-quiz-is-show-logo';
import { migration as migration008 } from './008-remove-crypto-pay-and-update-users';

// Список всех миграций в порядке выполнения
export const migrations: MigrationFile[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
];

// Экспортируем типы и runner
export { MigrationRunner } from './runner';
export type { MigrationFile, MigrationStatus } from './types';
