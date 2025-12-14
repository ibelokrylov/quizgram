/**
 * Маппинг ошибок API на ключи переводов для i18n
 * Преобразует сообщения об ошибках из API в понятные ключи для переводов
 */

// Маппинг сообщений об ошибках на ключи переводов
const errorMessageMap: Record<string, string> = {
	// Общие ошибки
	"Unauthorized": "error.unauthorized",
	"Forbidden": "error.forbidden",
	"Not found": "error.notFound",
	"Not find user": "error.userNotFound",
	"not find": "error.notFound",
	"Internal server error": "error.internalServer",
	"Unknown error": "error.unknown",
	"Invalid UID": "error.invalidUid",
	"Not updated": "error.notUpdated",
	"Not updated status": "error.notUpdatedStatus",
	"Quiz not found": "error.quizNotFound",
	"Bid not found or access denied": "error.bidNotFound",

	// Ошибки аутентификации
	"notification.user.no-authenticated": "error.unauthorized",
	"User with this email already exists": "error.emailExists",
	"User not found": "error.userNotFound",
	"Invalid or expired code": "error.codeInvalid",
	"Code has expired": "error.codeExpired",

	// Ошибки верификации
	"verification-email@failed": "error.verificationFailed",
	"verification-email@parse-error": "error.parseError",
	"verification-email@validation-error": "error.validationError",
	"resend-verification@failed": "error.resendVerificationFailed",

	// Ошибки восстановления пароля
	"verify-reset-password@error": "error.resetPassword",
	"verify-reset-password-end@error": "error.resetPassword",
	"verify-reset-password-end@error-body": "error.parseError",
	"verify-reset-password-end@error-validate": "error.validationError",

	// Ошибки регистрации
	"registration@error": "error.unknown",
	"registration@error-body-parse": "error.parseError",
	"registration@error-validate": "error.validationError",

	// Ошибки файлов
	"upload-file@email-not-confirmed": "error.emailNotConfirmed",
	"Email is not confirmed": "error.emailNotConfirmed",
	"upload-file@file-not-found": "error.fileNotFound",
	"upload-file@validation-error": "error.fileValidation",
	"upload-file@plan-restriction": "error.planRestriction",
	"Video upload is not available for your plan": "error.videoNotAvailable",
	"upload-file@resize-error": "error.fileResize",
	"upload-file@error": "error.uploadFile",
	"upload-file@parse-error": "error.parseError",
	"delete-file@error": "error.deleteFile",
	"delete-file@parse-error": "error.parseError",
	"delete-file@validation-error": "error.validationError",

	// Ошибки пользователя
	"session-profile@error": "error.getProfile",
	"get-user-plan@error": "error.getUserPlan",

	// Ошибки заявок
	"Access denied: FREE plan users can only view completed bids (isFull=true)":
		"error.freePlanBidsRestriction",

	// Ошибки публичного API
	"Session key is required. Please provide 'key' in request body or ensure bidToken cookie is set.":
		"error.sessionKeyRequired",
	"Failed to save answer": "error.failedToSaveAnswer",
	"Failed to save contacts": "error.failedToSaveContacts",
	"Failed to save": "error.failedToSave",
};

/**
 * Преобразует сообщение об ошибке из API в ключ перевода
 * @param errorMessage - сообщение об ошибке из API
 * @returns ключ перевода или исходное сообщение, если маппинг не найден
 */
export function mapApiErrorToTranslationKey(
	errorMessage: string | undefined | null,
): string {
	if (!errorMessage) {
		return "error.unknown";
	}

	// Если сообщение уже является ключом перевода (начинается с "error."), возвращаем его как есть
	if (errorMessage.startsWith("error.")) {
		return errorMessage;
	}

	// Проверяем точное совпадение
	if (errorMessageMap[errorMessage]) {
		return errorMessageMap[errorMessage];
	}

	// Проверяем частичное совпадение (для случаев, когда сообщение может содержать дополнительный текст)
	for (const [apiError, translationKey] of Object.entries(errorMessageMap)) {
		if (errorMessage.includes(apiError)) {
			return translationKey;
		}
	}

	// Если маппинг не найден, возвращаем общую ошибку
	return "error.unknown";
}

/**
 * Получает переведенное сообщение об ошибке
 * @param errorMessage - сообщение об ошибке из API
 * @param t - функция перевода из i18next
 * @returns переведенное сообщение
 */
export function getTranslatedError(
	errorMessage: string | undefined | null,
	t: (key: string) => string,
): string {
	const translationKey = mapApiErrorToTranslationKey(errorMessage);
	return t(translationKey);
}
