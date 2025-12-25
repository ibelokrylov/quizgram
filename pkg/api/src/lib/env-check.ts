// Проверка переменных окружения при запуске приложения
// Если обязательные переменные отсутствуют, приложение не запустится

import { logger } from './logger';

interface EnvVar {
	name: string;
	required: boolean;
	description?: string;
}

// Список обязательных переменных окружения
const REQUIRED_ENV_VARS: EnvVar[] = [
	{ name: 'JWT_SECRET', required: true, description: 'Секретный ключ для JWT токенов' },
	{ name: 'BOT_QUIZ_TOKEN', required: true, description: 'Токен Telegram бота для квизов (используется для валидации initData)' },
	{ name: 'BOT_CRM_TOKEN', required: true, description: 'Токен Telegram CRM бота' },
];

// Список переменных для базы данных (хотя бы DATABASE_URL или все POSTGRES_*)
const DATABASE_ENV_VARS: EnvVar[] = [
	{ name: 'DATABASE_URL', required: false, description: 'Полный URL подключения к PostgreSQL' },
	{ name: 'POSTGRES_USER', required: false, description: 'Пользователь PostgreSQL' },
	{ name: 'POSTGRES_PASSWORD', required: false, description: 'Пароль PostgreSQL' },
	{ name: 'POSTGRES_DB', required: false, description: 'Имя базы данных PostgreSQL' },
];

// Список опциональных переменных (для информационных сообщений)
const OPTIONAL_ENV_VARS: EnvVar[] = [
	{ name: 'S3_ACCESS_KEY', required: false, description: 'S3 Access Key (для работы с файлами)' },
	{ name: 'S3_SECRET_ACCESS_KEY', required: false, description: 'S3 Secret Access Key (для работы с файлами)' },
	{ name: 'S3_BUCKET_NAME', required: false, description: 'S3 Bucket Name (для работы с файлами)' },
	{ name: 'MAIL_HOST', required: false, description: 'SMTP хост (для отправки email)' },
	{ name: 'MAIL_USER', required: false, description: 'SMTP пользователь (для отправки email)' },
	{ name: 'MAIL_PASS', required: false, description: 'SMTP пароль (для отправки email)' },
	{ name: 'CRYPTO_PAY_TOKEN', required: false, description: 'Токен Crypto Pay API (для платежей)' },
	{ name: 'APP_URLS', required: false, description: 'Разрешенные URL для CORS (через запятую)' },
	{ name: 'NODE_ENV', required: false, description: 'Окружение (production/development)' },
	{ name: 'IS_DEV', required: false, description: 'Режим разработки (true/false)' },
	{ name: 'TZ', required: false, description: 'Часовой пояс (по умолчанию UTC)' },
	{ name: 'APP_NAME', required: false, description: 'Название приложения (по умолчанию TGMApp)' },
];

/**
 * Проверяет наличие обязательных переменных окружения
 * @throws Error если обязательные переменные отсутствуют
 */
export function checkRequiredEnvVars(): void {
	const env = typeof Bun !== "undefined" ? Bun.env : process.env;
	const missing: string[] = [];
	const errors: string[] = [];

	// Проверяем обязательные переменные
	for (const envVar of REQUIRED_ENV_VARS) {
		const value = env[envVar.name];
		if (!value || value.trim() === '' || value === 'ДОБАВИТЬ_ТОКЕН') {
			missing.push(envVar.name);
			errors.push(
				`  ❌ ${envVar.name}${envVar.description ? ` - ${envVar.description}` : ''}`,
			);
		}
	}

	// Проверяем переменные базы данных
	// Нужен либо DATABASE_URL, либо все POSTGRES_*
	const hasDatabaseUrl = !!env.DATABASE_URL;
	const hasPostgresVars =
		!!env.POSTGRES_USER && !!env.POSTGRES_PASSWORD && !!env.POSTGRES_DB;

	if (!hasDatabaseUrl && !hasPostgresVars) {
		missing.push('DATABASE_CONFIG');
		errors.push(
			'  ❌ DATABASE_CONFIG - Необходимо указать либо DATABASE_URL, либо все переменные: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB',
		);
	}

	// Если есть ошибки, выводим их и завершаем приложение
	if (errors.length > 0) {
		const errorMessage = [
			'',
			'═══════════════════════════════════════════════════════════════',
			'  КРИТИЧЕСКАЯ ОШИБКА: Отсутствуют обязательные переменные окружения',
			'═══════════════════════════════════════════════════════════════',
			'',
			'Отсутствующие переменные:',
			...errors,
			'',
			'Пожалуйста, настройте все обязательные переменные окружения в файле .env',
			'и перезапустите приложение.',
			'',
			'═══════════════════════════════════════════════════════════════',
			'',
		].join('\n');

		logger.error(errorMessage, new Error('Missing required environment variables'));

		// Выводим также информацию об опциональных переменных
		const optionalMissing: string[] = [];
		for (const envVar of OPTIONAL_ENV_VARS) {
			const value = env[envVar.name];
			if (!value || value.trim() === '') {
				optionalMissing.push(envVar.name);
			}
		}

		if (optionalMissing.length > 0) {
			logger.warn(
				`Отсутствуют опциональные переменные окружения (${optionalMissing.length}): ${optionalMissing.join(', ')}`,
			);
		}

		process.exit(1);
	}

	// Выводим информацию об опциональных переменных (только предупреждение)
	const optionalMissing: string[] = [];
	for (const envVar of OPTIONAL_ENV_VARS) {
		const value = env[envVar.name];
		if (!value || value.trim() === '') {
			optionalMissing.push(envVar.name);
		}
	}

	if (optionalMissing.length > 0) {
		logger.warn(
			`Отсутствуют опциональные переменные окружения (${optionalMissing.length}): ${optionalMissing.join(', ')}`,
			{
				missing: optionalMissing,
			},
		);
	}

	logger.info('Проверка переменных окружения завершена успешно', {
		required: REQUIRED_ENV_VARS.length,
		optional: OPTIONAL_ENV_VARS.length,
		optionalMissing: optionalMissing.length,
	});
}

