import { logger } from '../lib/logger';

export interface IpLocation {
  country: string | null;
  city: string | null;
  ip: string | null;
}

/**
 * Сервис для определения геолокации по IP адресу
 */
export abstract class IpLocationService {
  /**
   * Получает IP адрес из запроса Elysia
   * Проверяет заголовки x-forwarded-for, x-real-ip и другие
   * Также пытается получить IP из Bun server API для локальной разработки
   */
  static getClientIp(request: Request, server?: any): string | null {
    // Логируем все релевантные заголовки для отладки
    const headers = {
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
      'x-forwarded': request.headers.get('x-forwarded'),
      forwarded: request.headers.get('forwarded'),
    };

    logger.debug('Checking IP headers', { headers, url: request.url });

    // Проверяем заголовок x-forwarded-for (для прокси/балансировщиков)
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      // x-forwarded-for может содержать несколько IP через запятую, берем первый
      const ips = forwardedFor.split(',').map((ip) => ip.trim());
      const ip = ips[0] || null;
      logger.debug('IP found in x-forwarded-for', { ip, allIps: ips });
      return ip;
    }

    // Проверяем заголовок x-real-ip
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      const ip = realIp.trim();
      logger.debug('IP found in x-real-ip', { ip });
      return ip;
    }

    // Проверяем заголовок cf-connecting-ip (Cloudflare)
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) {
      const ip = cfIp.trim();
      logger.debug('IP found in cf-connecting-ip', { ip });
      return ip;
    }

    // Если заголовков нет, пытаемся получить из URL (для локальной разработки)
    try {
      const url = new URL(request.url);
      const hostname = url.hostname;
      // Проверяем, не является ли это IP адресом
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
        logger.debug('IP found in URL hostname', { ip: hostname });
        return hostname;
      }
    } catch (error) {
      logger.debug('Failed to parse URL for IP extraction', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Пытаемся получить IP через Bun server API (для локальной разработки)
    try {
      // @ts-ignore - Bun API может быть доступен
      if (typeof Bun !== 'undefined' && server?.requestIP) {
        const ipInfo = server.requestIP(request);
        if (ipInfo?.address) {
          const ip = ipInfo.address;
          logger.debug('IP found via Bun server.requestIP', { ip, ipInfo });
          return ip;
        }
      }
    } catch (error) {
      logger.debug('Failed to get IP via Bun API', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Для локальной разработки: если hostname localhost, возвращаем 127.0.0.1
    try {
      const url = new URL(request.url);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1') {
        logger.debug('Localhost detected, using 127.0.0.1', { hostname: url.hostname });
        return '127.0.0.1';
      }
    } catch (error) {
      logger.debug('Failed to parse URL for localhost check', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.warn('No IP address found in request headers or URL', { headers, url: request.url });
    return null;
  }

  /**
   * Определяет геолокацию по IP адресу используя ip-api.com
   * @param ip - IP адрес
   * @returns Объект с информацией о стране, городе и IP
   */
  static async getLocationByIp(ip: string | null): Promise<IpLocation> {
    if (!ip) {
      logger.debug('No IP provided for geolocation', { ip });
      return {
        country: null,
        city: null,
        ip: null,
      };
    }

    logger.debug('Starting geolocation lookup', { ip });

    // Пропускаем локальные IP адреса
    if (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.16.') ||
      ip.startsWith('172.17.') ||
      ip.startsWith('172.18.') ||
      ip.startsWith('172.19.') ||
      ip.startsWith('172.20.') ||
      ip.startsWith('172.21.') ||
      ip.startsWith('172.22.') ||
      ip.startsWith('172.23.') ||
      ip.startsWith('172.24.') ||
      ip.startsWith('172.25.') ||
      ip.startsWith('172.26.') ||
      ip.startsWith('172.27.') ||
      ip.startsWith('172.28.') ||
      ip.startsWith('172.29.') ||
      ip.startsWith('172.30.') ||
      ip.startsWith('172.31.')
    ) {
      logger.debug('Skipping geolocation for local IP', { ip });
      return {
        country: null,
        city: null,
        ip,
      };
    }

    try {
      // Используем ip-api.com (бесплатный, до 45 запросов в минуту без регистрации)
      // Формат: http://ip-api.com/json/{ip}?fields=status,message,country,city,query
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,message,country,city,query`,
        {
          headers: {
            Accept: 'application/json',
          },
          // Таймаут 5 секунд
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      logger.debug('IP geolocation API response', { ip, status: data.status, data });

      // Проверяем статус ответа
      if (data.status === 'fail') {
        logger.warn('IP geolocation API returned fail status', {
          ip,
          message: data.message,
          fullResponse: data,
        });
        return {
          country: null,
          city: null,
          ip,
        };
      }

      const result = {
        country: data.country || null,
        city: data.city || null,
        ip: data.query || ip,
      };

      logger.debug('IP geolocation successful', { ip, result });
      return result;
    } catch (error) {
      logger.error(
        'Failed to get IP geolocation',
        error instanceof Error ? error : new Error(String(error)),
        { ip }
      );
      // В случае ошибки возвращаем IP без геолокации
      return {
        country: null,
        city: null,
        ip,
      };
    }
  }

  /**
   * Получает IP из запроса и определяет геолокацию
   * @param request - Request объект из Elysia
   * @param server - Опциональный server объект для получения IP через Bun API
   * @returns Объект с информацией о геолокации
   */
  static async getLocationFromRequest(request: Request, server?: any): Promise<IpLocation> {
    logger.debug('Starting location determination from request', {
      url: request.url,
      method: request.method,
    });

    const ip = this.getClientIp(request, server);
    logger.debug('IP extracted from request', { ip });

    const location = await this.getLocationByIp(ip);
    logger.debug('Location determination completed', { ip, location });

    return location;
  }
}
