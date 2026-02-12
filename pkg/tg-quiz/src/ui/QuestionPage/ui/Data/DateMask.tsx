import { useContext, useEffect, useRef, useState } from 'react';
import { Input } from '../../../../ui/Input';
import { QuestionContext } from '../../Question.context';

export const DateMask = () => {
  const { sendAnswer, questions, current } = useContext(QuestionContext);
  const question = questions[current];

  const [value, setValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Вычисляем позицию каретки на основе количества введенных цифр
  const getCursorPosition = (digits: string): number => {
    const length = digits.length;

    if (length === 0) {
      return 0;
    } else if (length <= 2) {
      return length;
    } else if (length <= 4) {
      return length + 1; // +1 для точки после дня
    } else {
      return length + 2; // +2 для двух точек
    }
  };

  // Получаем количество дней в месяце
  const getDaysInMonth = (month: number, year?: number): number => {
    if (month < 1 || month > 12) return 31;

    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Если год указан и февраль - проверяем високосный год
    if (month === 2 && year) {
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      return isLeapYear ? 29 : 28;
    }

    return daysInMonth[month - 1];
  };

  // Валидация введенных цифр
  const validateDigits = (digits: string): string => {
    let validDigits = '';

    for (let i = 0; i < digits.length && i < 8; i++) {
      const digit = digits[i];

      if (i === 0) {
        // Первая цифра дня: может быть 0-3
        if (parseInt(digit) <= 3) {
          validDigits += digit;
        } else {
          break;
        }
      } else if (i === 1) {
        // Вторая цифра дня
        const day = parseInt(validDigits[0] + digit);
        if (day >= 1 && day <= 31) {
          validDigits += digit;
        } else {
          break;
        }
      } else if (i === 2) {
        // Первая цифра месяца: может быть 0-1
        if (parseInt(digit) <= 1) {
          validDigits += digit;
        } else {
          break;
        }
      } else if (i === 3) {
        // Вторая цифра месяца
        const month = parseInt(validDigits[2] + digit);
        const day = parseInt(validDigits.substring(0, 2));

        if (month >= 1 && month <= 12) {
          // Проверяем, что день не превышает количество дней в месяце
          const maxDays = getDaysInMonth(month);
          if (day <= maxDays) {
            validDigits += digit;
          } else {
            break;
          }
        } else {
          break;
        }
      } else if (i === 4) {
        // Первая цифра года: может быть 1-2 (для годов 1000-2999)
        if (parseInt(digit) >= 1 && parseInt(digit) <= 2) {
          validDigits += digit;
        } else {
          break;
        }
      } else if (i >= 5 && i <= 7) {
        // Остальные цифры года
        validDigits += digit;

        // Если ввели полный год, проверяем февраль на високосный год
        if (i === 7) {
          const day = parseInt(validDigits.substring(0, 2));
          const month = parseInt(validDigits.substring(2, 4));
          const year = parseInt(validDigits.substring(4, 8));

          if (month === 2) {
            const maxDays = getDaysInMonth(month, year);
            if (day > maxDays) {
              // Обрезаем год, если дата невалидна
              validDigits = validDigits.substring(0, 4);
              break;
            }
          }
        }
      }
    }

    return validDigits;
  };

  // Получаем отображаемое значение
  const getDisplayValue = (): string => {
    if (!isFocused && value === '') {
      return '';
    }

    if (isFocused && value === '') {
      return 'dd.mm.yyyy';
    }

    const digits = value.replace(/\D/g, '');
    const mask = 'dd.mm.yyyy';
    let result = '';
    let digitIndex = 0;

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] === '.' || mask[i] === '/') {
        result += '.';
      } else if (digitIndex < digits.length) {
        result += digits[digitIndex];
        digitIndex++;
      } else {
        result += mask[i];
      }
    }

    return result;
  };

  // Обработка изменения значения
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const digits = newValue.replace(/\D/g, '');

    // Валидируем введенные цифры
    const validDigits = validateDigits(digits);
    setValue(validDigits);

    // Если дата введена полностью (8 цифр), отправляем ответ
    if (validDigits.length === 8) {
      const day = validDigits.substring(0, 2);
      const month = validDigits.substring(2, 4);
      const year = validDigits.substring(4, 8);
      const formattedDate = `${day}.${month}.${year}`;

      sendAnswer({
        question_uid: question.uid,
        answer: formattedDate,
      });
    }
  };

  // Обработка фокуса
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Обработка потери фокуса
  const handleBlur = () => {
    setIsFocused(false);
  };

  // Позиционирование каретки после последней цифры при фокусе
  useEffect(() => {
    if (isFocused && inputRef.current) {
      const digits = value.replace(/\D/g, '');
      const position = getCursorPosition(digits);

      // Устанавливаем позицию каретки
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(position, position);
        }
      }, 0);
    }
  }, [value, isFocused]);

  return (
    <Input
      header="Дата"
      placeholder="26.11.1993"
      value={getDisplayValue()}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      ref={inputRef}
      type="text"
      inputMode="numeric"
    />
  );
};
