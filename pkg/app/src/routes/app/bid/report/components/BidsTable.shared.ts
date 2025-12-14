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
    'create': 'Создано',
    'created': 'Создано',
    'in_progress': 'В процессе',
    'rejected': 'Отклонено',
    'success': 'Успешно',
    'completed': 'Завершено',
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
export const formatLocation = (ipLocation: { country: string | null; city: string | null; ip: string | null } | null | undefined) => {
  if (!ipLocation) return '';
  const parts: string[] = [];
  if (ipLocation.city) parts.push(ipLocation.city);
  if (ipLocation.country) parts.push(ipLocation.country);
  return parts.length > 0 ? parts.join(', ') : '';
};

// Функция для форматирования контактов
export const formatContacts = (contacts: { answers?: Record<string, string>; form?: any[] } | null | undefined) => {
  if (!contacts || !contacts.answers) return '-';
  const answers = contacts.answers;
  const contactValues = Object.values(answers).filter(v => v && v.trim() !== '');
  return contactValues.length > 0 ? contactValues.join(', ') : '-';
};

// Тип контакта с значением
export interface ContactItem {
  type: 'name' | 'email' | 'phone' | 'text';
  label: string;
  value: string;
}

// Функция для получения массива контактов с типами
export const getContactsList = (contacts: { answers?: Record<string, string>; form?: any[] } | null | undefined): ContactItem[] => {
  if (!contacts || !contacts.answers || !contacts.form) return [];
  
  const answers = contacts.answers;
  const form = contacts.form;
  const contactsList: ContactItem[] = [];
  
  // Создаем мапу form по label для быстрого поиска типа
  const formMap = new Map<string, { type: 'name' | 'email' | 'phone' | 'text'; label: string }>();
  form.forEach((field) => {
    if (field.label && field.type) {
      formMap.set(field.label, { type: field.type, label: field.label });
    }
  });
  
  // Функция для форматирования телефона с префиксом +
  const formatPhone = (phone: string): string => {
    const trimmed = phone.trim();
    if (trimmed.startsWith('+')) {
      return trimmed;
    }
    return `+${trimmed}`;
  };

  // Проходим по answers и сопоставляем с form
  Object.entries(answers).forEach(([label, value]) => {
    if (value && value.trim() !== '') {
      const field = formMap.get(label);
      if (field) {
        const formattedValue = field.type === 'phone' ? formatPhone(value) : value.trim();
        contactsList.push({
          type: field.type,
          label: field.label,
          value: formattedValue,
        });
      } else {
        // Если не нашли в form, определяем тип по содержимому
        let detectedType: 'name' | 'email' | 'phone' | 'text' = 'text';
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          detectedType = 'email';
        } else if (/^[\d\s\-\+\(\)]+$/.test(value) && value.replace(/\D/g, '').length >= 7) {
          detectedType = 'phone';
        }
        const formattedValue = detectedType === 'phone' ? formatPhone(value) : value.trim();
        contactsList.push({
          type: detectedType,
          label,
          value: formattedValue,
        });
      }
    }
  });
  
  return contactsList;
};
