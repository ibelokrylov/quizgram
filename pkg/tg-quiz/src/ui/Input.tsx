import { Input as TelegramInput } from "@telegram-apps/telegram-ui";
import { forwardRef, type ComponentProps } from "react";
import { usePlatform } from "../hooks/use-platform";

export interface InputProps extends Omit<ComponentProps<typeof TelegramInput>, 'children'> {
  className?: string;
}

/**
 * Обёртка над Input из telegram-ui с поддержкой кастомных стилей
 * Автоматически применяет стили для iOS платформы
 * Примечание: children исключены из props, т.к. input - void элемент
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", status, ...props }, ref) => {
    const platform = usePlatform();
    const platformClass = platform === "ios" ? "input--ios" : "input--base";
    const dataAttributes = status ? { "data-status": status } : {};

    return (
      <TelegramInput
        ref={ref}
        className={`${platformClass} ${className}`.trim()}
        status={status}
        {...dataAttributes}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

