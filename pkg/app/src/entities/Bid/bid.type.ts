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
  contacts?: {
    answers?: Record<string, string>;
    form?: any[];
  } | null;
  ipLocation?: {
    country: string | null;
    city: string | null;
    ip: string | null;
  } | null;
}

// Внутренняя структура данных (data внутри ответа)
export interface BidsListData {
  data: BidListItem[];
  total: number; // Количество isFull = true
  totalNotFull: number; // Количество isFull = false
  hasMore: boolean;
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
  limit?: number;
  offset?: number;
}
