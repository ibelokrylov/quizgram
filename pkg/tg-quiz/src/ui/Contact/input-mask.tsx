import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
} from 'react';
import { Input } from '../Input';

interface InputMaskProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'children'
> {
  mask?: string;
  value?: string;
  onChange?: (value: string) => void;
  header?: string;
  placeholder?: string;
  status?: 'default' | 'error' | 'focused';
}

export const InputMask = ({
  mask = '+7 (###) ###-##-##',
  value = '',
  onChange,
  children: _children,
  ...props
}: InputMaskProps & { children?: React.ReactNode }) => {
  // Извлекаем префикс маски (цифры, которые уже есть в маске, не являющиеся #)
  const maskPrefix = useMemo(() => {
    const prefixDigits: string[] = [];
    for (const char of mask) {
      if (char === '#') break;
      if (/\d/.test(char)) {
        prefixDigits.push(char);
      }
    }
    return prefixDigits.join('');
  }, [mask]);

  const maskPrefixLength = maskPrefix.length;
  const maxUserDigits = mask.match(/#/g)?.length || 0;
  const maskPrefixEnd = mask.indexOf('#');

  const userDigitsRef = useRef<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Получаем начало маски (до первого #)
  const maskStart = useMemo(() => {
    return maskPrefix ? mask.substring(0, maskPrefixEnd) : '';
  }, [mask, maskPrefix, maskPrefixEnd]);

  // Инициализируем начальное значение с учетом маски
  const [inputValue, setInputValue] = useState(() => {
    if (value) {
      const allDigits = value.replace(/\D/g, '');
      let userDigits = allDigits;
      if (maskPrefix && allDigits.startsWith(maskPrefix)) {
        userDigits = allDigits.slice(maskPrefixLength);
      }
      userDigitsRef.current = userDigits;
      // Применяем маску к цифрам пользователя
      if (!userDigits) {
        return '';
      }
      let result = mask;
      let digitIndex = 0;
      const limitedDigits = userDigits.slice(0, maxUserDigits);
      result = result.replace(/#/g, () => {
        if (digitIndex < limitedDigits.length) {
          return limitedDigits[digitIndex++];
        }
        return '#';
      });
      const lastDigitPos = result.split('').reduce((lastPos, char, index) => {
        return char !== '#' && /\d/.test(char) ? index : lastPos;
      }, -1);
      if (lastDigitPos === -1) {
        return '';
      }
      return result.substring(0, lastDigitPos + 1);
    }
    return '';
  });

  // Применяем маску к цифрам пользователя (без префикса)
  const applyMask = useCallback(
    (userDigits: string): string => {
      // Если цифр нет, возвращаем префикс маски или пустую строку
      if (!userDigits) {
        return maskPrefix ? mask.substring(0, maskPrefixEnd) : '';
      }

      // Ограничиваем количество цифр до количества плейсхолдеров в маске
      const limitedDigits = userDigits.slice(0, maxUserDigits);

      // Применяем маску
      let result = mask;
      let digitIndex = 0;

      // Заменяем символы # на цифры по порядку
      result = result.replace(/#/g, () => {
        if (digitIndex < limitedDigits.length) {
          return limitedDigits[digitIndex++];
        }
        return '#';
      });

      // Обрезаем строку до последней введенной цифры
      const lastDigitPos = result.split('').reduce((lastPos, char, index) => {
        return char !== '#' && /\d/.test(char) ? index : lastPos;
      }, -1);

      if (lastDigitPos === -1) {
        return maskPrefix ? mask.substring(0, maskPrefixEnd) : '';
      }

      return result.substring(0, lastDigitPos + 1);
    },
    [mask, maskPrefix, maskPrefixEnd, maxUserDigits]
  );

  // Обновляем значение при изменении маски
  useEffect(() => {
    const currentUserDigits = userDigitsRef.current;
    if (currentUserDigits) {
      // Переприменяем маску к текущим цифрам пользователя
      setInputValue(applyMask(currentUserDigits));
    }
    // Если цифр нет, не меняем inputValue - пусть остается как есть
  }, [mask, maskPrefix, maskPrefixEnd, applyMask]);

  // Синхронизируем внутреннее состояние с внешним value
  useEffect(() => {
    if (value !== undefined) {
      const allDigits = value.replace(/\D/g, '');
      // Извлекаем только цифры пользователя (без префикса)
      let userDigits = allDigits;
      if (maskPrefix && allDigits.startsWith(maskPrefix)) {
        userDigits = allDigits.slice(maskPrefixLength);
      }

      if (userDigits !== userDigitsRef.current) {
        userDigitsRef.current = userDigits;
        const masked = applyMask(userDigits);
        // Если есть цифры - показываем отформатированное значение, иначе сохраняем текущее inputValue
        if (masked) {
          setInputValue(masked);
        }
        // Если masked пустое, не меняем inputValue - сохраняем текущее состояние
      }
    }
  }, [value, maskPrefix, maskPrefixLength, applyMask]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const previousUserDigits = userDigitsRef.current;

    // Извлекаем все цифры из нового значения
    const newAllDigits = newValue.replace(/\D/g, '');

    // Определяем цифры пользователя
    let newUserDigits: string;

    if (maskPrefix) {
      // Если есть префикс маски
      if (newAllDigits.startsWith(maskPrefix) && newAllDigits.length > maskPrefixLength) {
        // Есть префикс в начале и есть цифры после него - берем цифры после префикса
        newUserDigits = newAllDigits.slice(maskPrefixLength);
      } else if (newAllDigits === maskPrefix) {
        // Только префикс - цифр пользователя нет
        newUserDigits = '';
      } else if (newAllDigits.length <= maskPrefixLength) {
        // Цифр меньше или равно длине префикса, но это не префикс
        // Это начало ввода - берем все цифры как цифры пользователя
        newUserDigits = newAllDigits;
      } else {
        // Цифр больше префикса, но не начинается с префикса
        // Это может быть случай, когда пользователь вводит цифры без префикса
        // Берем все цифры как цифры пользователя
        newUserDigits = newAllDigits;
      }
    } else {
      // Нет префикса - все цифры являются цифрами пользователя
      newUserDigits = newAllDigits;
    }

    // Ограничиваем количество цифр
    newUserDigits = newUserDigits.slice(0, maxUserDigits);

    // Если ничего не изменилось, ничего не делаем
    if (newUserDigits === previousUserDigits) {
      return;
    }

    // Обновляем состояние
    userDigitsRef.current = newUserDigits;
    const masked = applyMask(newUserDigits);
    // Если есть цифры - показываем отформатированное значение, иначе - пустую строку или начало маски при фокусе
    setInputValue(masked || (isFocused ? maskStart : ''));

    // Возвращаем все цифры (с префиксом) в onChange
    const allDigits = maskPrefix + newUserDigits;
    onChange?.(allDigits);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Проверяем реальное наличие введенных цифр через ref
    // Если нет введенных цифр, показываем начало маски
    if (!userDigitsRef.current) {
      setInputValue(maskStart);
    }
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // Проверяем реальное наличие введенных цифр через ref
    if (userDigitsRef.current) {
      // Если есть введенные цифры, всегда сохраняем отформатированное значение
      // Переприменяем маску чтобы гарантировать правильное отображение
      const masked = applyMask(userDigitsRef.current);
      if (masked) {
        setInputValue(masked);
      }
    }
    // Если нет введенных цифр, не меняем inputValue - оставляем как есть
    props.onBlur?.(e);
  };

  // Вычисляем отображаемое значение
  // Если есть отформатированное значение (inputValue), всегда показываем его
  // Иначе показываем maskStart при фокусе или пустую строку (placeholder)
  const displayValue = inputValue || (isFocused ? maskStart : '');

  return (
    <Input
      {...props}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
};
