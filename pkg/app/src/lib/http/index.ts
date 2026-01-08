const http = async <T = undefined>(dto: {
  url: string;
  method?: "GET" | "POST" | "DELETE" | "PUT";
  body?: Record<never, never>;
  formData?: FormData;
}): Promise<HttpResponse<T>> => {
  const { method = "GET" } = dto;
  const _url = dto.url.startsWith("http") ? dto.url : import.meta.env.VITE_PUBLIC_API_URL + dto.url;

  const config: RequestInit = {
    credentials: "include",
    method,
  };

  if (dto.formData) {
    config.body = dto.formData;
  } else if (dto.body) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    config.body = JSON.stringify(dto.body);
    config.headers = myHeaders;
  }

  const response = await fetch(_url, config);
  const data = await response.json();

  if (!response.ok) {
    // Обработка специальных случаев для Telegram авторизации
    if (response.status === 404 && data?.requiresRegistration) {
      // Пользователь не найден - требуется регистрация через Telegram
      const error = new Error(data?.error || "registration_required");
      (error as any).requiresRegistration = true;
      throw error;
    }
    throw new Error(data?.error);
  }

  return data as HttpResponse<T>;
};

export type HttpResponse<T = undefined> = {
  data: T;
  error?: string;
  message: string;
};

export default http;
