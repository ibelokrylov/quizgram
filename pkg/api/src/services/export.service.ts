import { logger } from '../lib/logger';

export type BidExportData = {
  uid: string;
  key: string;
  status: string;
  isFull: boolean;
  isRead: boolean;
  first: boolean;
  createdAt: string;
  updatedAt: string;
  adminUpdatedAt: string | null;
  quizName: string;
  contacts: Record<string, string> | null;
  ipLocation: { country: string | null; city: string | null; ip: string | null } | null;
  info?: any | null;
};

export abstract class ExportService {
  /**
   * Генерирует CSV файл из данных заявок
   * @param bids - массив данных заявок
   * @returns строка CSV с BOM для корректного отображения в Excel
   */
  static generateCSV(bids: BidExportData[]): string {
    try {
      // Заголовки CSV
      const headers = [
        'ID',
        'Квиз',
        'Статус',
        'Заполнена полностью',
        'Прочитана',
        'Первая заявка',
        'Дата создания',
        'Дата обновления',
        'Дата обновления админом',
        'Имя',
        'Email',
        'Телефон',
        'Страна',
        'Город',
        'IP адрес',
      ];

      // Функция для экранирования значений CSV
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) {
          return '';
        }
        const str = String(value);
        // Если значение содержит запятую, кавычки или перенос строки, оборачиваем в кавычки
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Создаем строку CSV
      const rows: string[] = [];

      // Добавляем BOM для UTF-8 (чтобы Excel правильно открывал файл)
      rows.push('\uFEFF');

      // Добавляем заголовки
      rows.push(headers.map(escapeCSV).join(';'));

      // Добавляем данные
      for (const bid of bids) {
        // Извлекаем контакты
        const contacts = bid.contacts || {};
        const name = contacts.name || contacts.first_name || contacts.last_name || '';
        const email = contacts.email || '';
        const phone = contacts.phone || contacts.phone_number || '';

        // Извлекаем геолокацию
        const ipLocation = bid.ipLocation || { country: null, city: null, ip: null };
        const country = ipLocation.country || '';
        const city = ipLocation.city || '';
        const ip = ipLocation.ip || '';

        // Форматируем даты в читаемый вид
        const formatDate = (dateStr: string | null): string => {
          if (!dateStr) return '';
          try {
            const date = new Date(dateStr);
            return date.toLocaleString('ru-RU', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
          } catch {
            return dateStr;
          }
        };

        const row = [
          bid.key,
          bid.quizName,
          bid.status,
          bid.isFull ? 'Да' : 'Нет',
          bid.isRead ? 'Да' : 'Нет',
          bid.first ? 'Да' : 'Нет',
          formatDate(bid.createdAt),
          formatDate(bid.updatedAt),
          formatDate(bid.adminUpdatedAt),
          name,
          email,
          phone,
          country,
          city,
          ip,
        ];

        rows.push(row.map(escapeCSV).join(';'));
      }

      const csvContent = rows.join('\n');

      logger.debug('CSV file generated', {
        bidsCount: bids.length,
        csvLength: csvContent.length,
      });

      return csvContent;
    } catch (error) {
      logger.error('Failed to generate CSV', error as Error, {
        bidsCount: bids.length,
      });
      throw error;
    }
  }

  /**
   * Генерирует Excel файл из данных заявок
   * @param bids - массив данных заявок
   * @returns Buffer с содержимым Excel файла
   */
  static async generateExcel(bids: BidExportData[]): Promise<Buffer> {
    try {
      // Динамически импортируем exceljs только когда нужен
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Заявки');

      // Заголовки
      worksheet.columns = [
        { header: 'ID', key: 'key', width: 40 },
        { header: 'Квиз', key: 'quizName', width: 30 },
        { header: 'Статус', key: 'status', width: 15 },
        { header: 'Заполнена полностью', key: 'isFull', width: 20 },
        { header: 'Прочитана', key: 'isRead', width: 15 },
        { header: 'Первая заявка', key: 'first', width: 15 },
        { header: 'Дата создания', key: 'createdAt', width: 20 },
        { header: 'Дата обновления', key: 'updatedAt', width: 20 },
        { header: 'Дата обновления админом', key: 'adminUpdatedAt', width: 25 },
        { header: 'Имя', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Телефон', key: 'phone', width: 20 },
        { header: 'Страна', key: 'country', width: 20 },
        { header: 'Город', key: 'city', width: 20 },
        { header: 'IP адрес', key: 'ip', width: 15 },
      ];

      // Стили для заголовков
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Добавляем данные
      for (const bid of bids) {
        // Извлекаем контакты
        const contacts = bid.contacts || {};
        const name = contacts.name || contacts.first_name || contacts.last_name || '';
        const email = contacts.email || '';
        const phone = contacts.phone || contacts.phone_number || '';

        // Извлекаем геолокацию
        const ipLocation = bid.ipLocation || { country: null, city: null, ip: null };
        const country = ipLocation.country || '';
        const city = ipLocation.city || '';
        const ip = ipLocation.ip || '';

        // Форматируем даты
        const formatDate = (dateStr: string | null): Date | null => {
          if (!dateStr) return null;
          try {
            return new Date(dateStr);
          } catch {
            return null;
          }
        };

        worksheet.addRow({
          key: bid.key,
          quizName: bid.quizName,
          status: bid.status,
          isFull: bid.isFull ? 'Да' : 'Нет',
          isRead: bid.isRead ? 'Да' : 'Нет',
          first: bid.first ? 'Да' : 'Нет',
          createdAt: formatDate(bid.createdAt),
          updatedAt: formatDate(bid.updatedAt),
          adminUpdatedAt: formatDate(bid.adminUpdatedAt),
          name,
          email,
          phone,
          country,
          city,
          ip,
        });
      }

      // Форматируем колонки с датами
      worksheet.getColumn('createdAt').numFmt = 'dd.mm.yyyy hh:mm';
      worksheet.getColumn('updatedAt').numFmt = 'dd.mm.yyyy hh:mm';
      worksheet.getColumn('adminUpdatedAt').numFmt = 'dd.mm.yyyy hh:mm';

      // Добавляем автофильтры
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: worksheet.columnCount },
      };

      // Генерируем буфер
      const buffer = await workbook.xlsx.writeBuffer();

      logger.debug('Excel file generated', {
        bidsCount: bids.length,
        bufferSize: buffer.byteLength,
      });

      return Buffer.from(buffer);
    } catch (error) {
      logger.error('Failed to generate Excel', error as Error, {
        bidsCount: bids.length,
      });
      throw error;
    }
  }
}
