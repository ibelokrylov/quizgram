import { Button, Card, Input, Placeholder, Snackbar } from '@telegram-apps/telegram-ui';
import { useContext, useEffect, useState } from 'react';
import { AppContext, type QuizContact } from '../../App.context';
import { InputMask } from './input-mask';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const Contact = () => {
  const { quiz, nextStage } = useContext(AppContext);
  const contact = (Array.isArray(quiz?.contact) ? quiz.contact[0] : undefined) as QuizContact | undefined;

  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const contactForm = contact?.form?.length
    ? contact.form
    : [
        {
          'step': 0,
          'type': 'name',
          'label': 'Имя',
          'required': true,
          'placeholder': 'Иван',
        },
        {
          'step': 0,
          'type': 'email',
          'label': 'Email',
          'required': true,
          'placeholder': 'mail@example.com',
        },
        {
          'mask': '+990 (###) ###-##-##',
          'step': 0,
          'type': 'phone',
          'label': 'Телефон',
          'required': true,
          'placeholder': '+7 (999) 999-99-99',
        },
      ];

  const [formData, setFormData] = useState<Record<string, string>>({});

  // Очищаем sessionStorage при загрузке компонента
  useEffect(() => {
    const storageKey = `quiz_contact_${quiz?.uid}`;
    sessionStorage.removeItem(storageKey);
  }, [quiz?.uid]);

  // Устанавливаем background, как в Standard.tsx
  useEffect(() => {
    const element = window.document.querySelector('#root');
    const url = contact?.background;
    const footer = document.querySelector('.footer__logo') as HTMLElement;

    if (!element) return;

    if (!url) {
      //clear background
      element.setAttribute('style', '');
      // Сбрасываем стили футера
      if (footer) {
        footer.style.position = '';
        footer.style.bottom = '';
        footer.style.left = '';
        footer.style.transform = '';
      }
      return;
    }

    element.setAttribute(
      'style',
      `
        background-image: url(${url});
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        background-attachment: fixed;
        background-color: transparent;
        opacity: 1;
        transition: background-image 0.3s ease-in-out;
        height: 100vh;
        width: 100vw;
      `
    );

    // Прибиваем футер к низу страницы по центру
    if (footer) {
      footer.style.position = 'absolute';
      footer.style.bottom = '6px';
      footer.style.left = '50%';
      footer.style.transform = 'translateX(-50%)';
    }

    // Cleanup при размонтировании
    return () => {
      if (footer) {
        footer.style.position = '';
        footer.style.bottom = '';
        footer.style.left = '';
        footer.style.transform = '';
      }

      element.setAttribute('style', '');
    };
  }, [contact?.background]);

  // Валидация email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Валидация телефона - проверяем, что все символы # в маске заполнены
  const isValidPhone = (phone: string, mask: string): boolean => {
    if (!phone) return false;
    const allDigits = phone.replace(/\D/g, '');
    const maskDigits = mask.match(/#/g)?.length || 0;

    // Извлекаем префикс маски
    const prefixDigits: string[] = [];
    for (const char of mask) {
      if (char === '#') break;
      if (/\d/.test(char)) {
        prefixDigits.push(char);
      }
    }
    const prefix = prefixDigits.join('');
    const prefixLength = prefix.length;

    // Если есть префикс, проверяем что телефон начинается с него
    if (prefix && !allDigits.startsWith(prefix)) {
      return false;
    }

    // Извлекаем цифры пользователя (без префикса)
    const userDigits = prefix ? allDigits.slice(prefixLength) : allDigits;

    // Проверяем, что количество цифр пользователя равно количеству # в маске
    return userDigits.length === maskDigits;
  };

  const handleSubmit = async () => {
    setErrors(new Set());
    const newErrors = new Set<string>();
    let firstErrorField = '';

    // Проверка required полей
    contactForm.forEach((field) => {
      if (field.required) {
        const value = formData[field.type] || '';
        if (!value.trim()) {
          newErrors.add(field.type);
          if (!firstErrorField) {
            firstErrorField = field.label || field.type;
          }
        }
      }
    });

    // Если есть незаполненные required поля, показываем ошибки
    if (newErrors.size > 0) {
      setErrors(newErrors);
      setErrorMessage('Заполните обязательные поля');
      return;
    }

    // Валидация полей по типам
    contactForm.forEach((field) => {
      const value = formData[field.type] || '';

      if (field.type === 'email' && value) {
        if (!isValidEmail(value)) {
          newErrors.add(field.type);
          if (!firstErrorField) {
            firstErrorField = field.label || field.type;
          }
        }
      }

      if (field.type === 'phone' && value && field.mask) {
        if (!isValidPhone(value, field.mask)) {
          newErrors.add(field.type);
          if (!firstErrorField) {
            firstErrorField = field.label || field.type;
          }
        }
      }

      if (field.type === 'name' && value) {
        if (value.trim().length < 3) {
          newErrors.add(field.type);
          if (!firstErrorField) {
            firstErrorField = field.label || field.type;
          }
        }
      }
    });

    // Устанавливаем ошибки
    setErrors(newErrors);

    if (newErrors.size > 0) {
      // Определяем сообщение об ошибке в зависимости от типа
      const errorMessages: Record<string, string> = {
        email: 'Введите корректный email адрес',
        phone: 'Введите корректный номер телефона',
        name: 'Имя должно содержать не менее 3 символов',
      };

      const firstErrorType = Array.from(newErrors)[0];
      setErrorMessage(errorMessages[firstErrorType] || 'Проверьте правильность заполнения полей');
      return;
    }

    // Если валидация прошла успешно, отправляем данные
    if (!quiz?.uid) {
      setErrorMessage('Ошибка: не найден идентификатор квиза');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Сохраняем данные в sessionStorage
    const storageKey = `quiz_contact_${quiz.uid}`;
    sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        answers: formData,
        form: contactForm,
      })
    );

    // Получаем key из sessionStorage
    let quizKey: string | null = null;
    try {
      quizKey = sessionStorage.getItem('quizKey');
    } catch (error) {
      console.error('Failed to get quiz key from session storage:', error);
    }

    try {
      // Добавляем key в body, если он есть
      const contactsData = quizKey
        ? {
            answers: formData,
            form: contactForm,
            key: quizKey,
          }
        : {
            answers: formData,
            form: contactForm,
          };

      const response = await fetch(`${API_BASE_URL}/v1/public/quiz/${quiz.uid}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(contactsData),
      });

      if (!response.ok) {
        throw new Error('Ошибка при отправке данных');
      }

      // Успешная отправка
      setErrorMessage('');
      nextStage();
    } catch (error) {
      console.error('Ошибка при отправке формы:', error);
      setErrorMessage('Ошибка при отправке данных. Попробуйте еще раз.');
    } finally {
      nextStage();
      setIsSubmitting(false);
    }
  };

  return (
    <div className='contact'>
      <Card className='cards full'>
        <Placeholder
          header={contact?.title ?? 'Заполните форму, чтобы получить результаты теста'}
          description={contact?.description}
        />
        <div className='contact__form'>
          {contactForm.map((field) => {
            if (field.type === 'phone') {
              return (
                <InputMask
                  key={field.type}
                  mask={field.mask}
                  header={field.required ? `${field.label} *` : field.label}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={formData[field.type] || ''}
                  status={errors.has(field.type) ? 'error' : undefined}
                  onChange={(value) => {
                    setFormData({ ...formData, [field.type]: value });
                    // Убираем ошибку при вводе
                    if (errors.has(field.type)) {
                      const newErrors = new Set(errors);
                      newErrors.delete(field.type);
                      setErrors(newErrors);
                      if (newErrors.size === 0) {
                        setErrorMessage('');
                      }
                    }
                  }}
                />
              );
            }
            return (
              <Input
                key={field.type}
                header={field.required ? `${field.label} *` : field.label}
                placeholder={field.placeholder}
                required={field.required}
                value={formData[field.type] || ''}
                status={errors.has(field.type) ? 'error' : undefined}
                onChange={(e) => {
                  setFormData({ ...formData, [field.type]: e.target.value });
                  // Убираем ошибку при вводе
                  if (errors.has(field.type)) {
                    const newErrors = new Set(errors);
                    newErrors.delete(field.type);
                    setErrors(newErrors);
                    if (newErrors.size === 0) {
                      setErrorMessage('');
                    }
                  }
                }}
              />
            );
          })}
        </div>
        <div
          className='contact__button'
          style={{ marginTop: '2rem' }}
        >
          <Button
            className='contact__button-submit'
            size={'l'}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Отправка...' : 'Отправить'}
          </Button>
        </div>
      </Card>
      {errorMessage && (
        <Snackbar
          onClose={() => {
            setErrorMessage('');
          }}
        >
          {errorMessage}
        </Snackbar>
      )}
    </div>
  );
};
