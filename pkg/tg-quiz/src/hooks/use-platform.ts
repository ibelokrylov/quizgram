import { useMemo } from "react";
import { getPlatform } from "../lib/telegram-webapp";

/**
 * Хук для получения platform из Telegram WebApp
 * @returns "ios" если платформа iOS, иначе "base"
 */
export function usePlatform(): "base" | "ios" {
  return useMemo(() => getPlatform(), []);
}

