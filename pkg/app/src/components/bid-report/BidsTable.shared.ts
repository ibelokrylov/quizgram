// Общие утилиты для форматирования данных заявок

// Функция для форматирования даты в формат dd.mm.yyyy HH:MM
export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

// Функция для получения текста статуса
export const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    create: 'Создано',
    created: 'Создано',
    in_progress: 'В процессе',
    rejected: 'Отклонено',
    success: 'Успешно',
    completed: 'Завершено',
  };
  return statusMap[status] || status;
};

// Функция для получения цвета статуса
export const getStatusColor = (status: string) => {
  if (status === 'create' || status === 'created') {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
  if (status === 'in_progress') {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  }
  if (status === 'rejected') {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
  if (status === 'success' || status === 'completed') {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
};

// Функция для форматирования локации
// Возвращает пустую строку, если локации нет
export const formatLocation = (
  ipLocation: { country: string | null; city: string | null; ip: string | null } | null | undefined
) => {
  if (!ipLocation) return '';
  const parts: string[] = [];
  if (ipLocation.city) parts.push(ipLocation.city);
  if (ipLocation.country) parts.push(ipLocation.country);
  return parts.length > 0 ? parts.join(', ') : '';
};

// Функция для форматирования контактов
export const formatContacts = (contacts: Record<string, string> | null | undefined) => {
  if (!contacts || typeof contacts !== 'object') return '-';
  const contactValues = Object.values(contacts).filter((v) => v && v.trim() !== '');
  return contactValues.length > 0 ? contactValues.join(', ') : '-';
};

// Тип контакта с значением
export interface ContactItem {
  type: 'name' | 'email' | 'phone' | 'text';
  label: string;
  value: string;
}

// Функция для получения массива контактов с типами
// contacts теперь просто Record<string, string> с ответами пользователя
export const getContactsList = (
  contacts: Record<string, string> | null | undefined
): ContactItem[] => {
  if (!contacts || typeof contacts !== 'object') return [];

  const contactsList: ContactItem[] = [];

  // Функция для форматирования телефона с префиксом +
  const formatPhone = (phone: string): string => {
    const trimmed = phone.trim();
    if (trimmed.startsWith('+')) {
      return trimmed;
    }
    return `+${trimmed}`;
  };

  // Определяем тип по ключу и содержимому значения
  Object.entries(contacts).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      // Определяем тип по ключу (name, email, phone, text) или по содержимому
      let detectedType: 'name' | 'email' | 'phone' | 'text' = 'text';
      const lowerKey = key.toLowerCase();

      if (lowerKey === 'name' || lowerKey.includes('name')) {
        detectedType = 'name';
      } else if (lowerKey === 'email' || lowerKey.includes('email')) {
        detectedType = 'email';
      } else if (lowerKey === 'phone' || lowerKey.includes('phone') || lowerKey.includes('tel')) {
        detectedType = 'phone';
      } else {
        // Определяем тип по содержимому, если ключ не помог
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          detectedType = 'email';
        } else if (/^[\d\s\-\+\(\)]+$/.test(value) && value.replace(/\D/g, '').length >= 7) {
          detectedType = 'phone';
        }
      }

      const formattedValue = detectedType === 'phone' ? formatPhone(value) : value.trim();
      contactsList.push({
        type: detectedType,
        label: key,
        value: formattedValue,
      });
    }
  });

  return contactsList;
};
