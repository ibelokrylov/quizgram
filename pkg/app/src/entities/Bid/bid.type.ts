// Типы для работы с заявками (bids)

export interface BidListItem {
	uid: string;
	key: string;
	status: string;
	isFull: boolean;
	isRead: boolean;
	first: boolean;
	createdAt: string;
	updatedAt: string;
	quizName: string;
	contacts?: Record<string, string> | null; // Ответы пользователя на форму контактов
	ipLocation?: {
		country: string | null;
		city: string | null;
		ip: string | null;
	} | null;
	info?: any | null; // Дополнительная информация из таблицы quiz_bid (только для planId != 1)
}

// Внутренняя структура данных (data внутри ответа)
export interface BidsListData {
	data: BidListItem[];
	total: number; // Количество isFull = true
	totalNotFull?: number; // Количество isFull = false (не возвращается для FREE плана)
	hasMore: boolean;
	hasMoreBeyondLimit?: boolean; // Есть ли заявки сверх лимита
	beyondLimitCount: number; // Количество заявок с isFull = true, которые не влезли из-за лимита тарифного плана
	maxAvailableFull: number; // Количество доступных заявок с isFull = true в пределах лимита тарифного плана
	deletedInLimitFull: number; // Количество удаленных заявок с isFull = true, которые влезли в лимит
}

// Полный ответ API (с оберткой message/data)
export interface BidsListResponse {
	message: string;
	data: BidsListData;
}

export interface BidsListFilters {
	quiz_uid?: string;
	status?: string;
	isFull?: boolean;
	isRead?: boolean; // Фильтр по прочитанным/новым заявкам
	limit?: number;
	offset?: number;
}

// Детали заявки
export interface BidDetails {
	uid: string;
	key: string;
	status: string;
	isFull: boolean;
	first: boolean; // Первый ли это запрос квиза
	createdAt: string;
	updatedAt: string;
	quizName: string;
	data: any; // Полные данные заявки (ответы, контакты и т.д.) - поле answer из таблицы
	info?: any | null; // Дополнительная информация
	questions?: any | null; // Вопросы квиза
	contacts?: Record<string, string> | null; // Ответы пользователя на форму контактов
	contactsForm?: any[] | null; // Форма контактов из квиза
	userInfo?: any | null; // Информация о пользователе из Telegram
	initData?: string | null; // Telegram WebApp initData как строка
	ipLocation?: {
		country: string | null;
		city: string | null;
		region?: string | null;
		timezone?: string | null;
		ip: string | null;
	} | null;
}
