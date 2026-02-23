import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthContext } from '@/entities/User/auth.context';
import { userRegistrationZod, type UserRegistration, type User } from '@/entities/User/User.type';
import http from '@/lib/http';
import { Link } from '@tanstack/react-router';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { queryClinet } from '@/app/query-client';

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [error, setError] = useState<Record<string, boolean> | null>(null);
  const [loading, setLoading] = useState(false);
  const [invalidReferralCode, setInvalidReferralCode] = useState<string | null>(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [dataProcessingAgreed, setDataProcessingAgreed] = useState(false);
  const [data, setData] = useState<UserRegistration & { passwordConfirm: string }>({
    login: '',
    password: '',
    name: '',
    remember: true,
    passwordConfirm: '',
    referralCode: '',
  });

  const ctx = useContext(AuthContext);
  const { i18n, t } = useTranslation('common');

  function change(v: string | boolean, type: keyof typeof data) {
    // Если изменяется реферальный код, сбрасываем ошибку и сохраненное значение
    if (type === 'referralCode') {
      setInvalidReferralCode(null);
      setError({ ...error, referralCode: false });
    } else {
      setError({ ...error, [type]: false });
    }
    setData({ ...data, [type]: v });
  }

  async function registration() {
    // Проверяем, был ли ранее неверный реферальный код и не изменился ли он
    if (
      invalidReferralCode !== null &&
      data.referralCode === invalidReferralCode &&
      data.referralCode !== ''
    ) {
      toast.error(t('registration.referralCode.changeRequired'));
      setError({ referralCode: true });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const parse = userRegistrationZod.safeParse(data);
      if (parse.error) {
        let err = {};
        for (const e of JSON.parse(parse.error.message)) {
          err = { ...err, [e.path[0]]: true };
        }
        if (Object.keys(err).length > 0) {
          setError(err);
        }
      } else {
        if (data.password !== data.passwordConfirm) {
          setError({ ...error, passwordConfirm: true });
        } else {
          // Получаем текущий язык из i18n
          const currentLanguage = i18n.language || 'en';
          const language =
            currentLanguage === 'ru' || currentLanguage.startsWith('ru') ? 'ru' : 'en';

          const res = await http<User>({
            url: '/v1/auth/registration',
            method: 'POST',
            body: {
              login: data.login,
              password: data.password,
              name: data.name,
              remember: data.remember,
              language,
              referralCode: data.referralCode || undefined,
            },
          });
          if (res.data) {
            ctx.setUser(res.data);
            ctx.setIsAuth(true);
            queryClinet.invalidateQueries({ queryKey: ['user'] });
            queryClinet.invalidateQueries({ queryKey: ['user-plan'] });

            // Устанавливаем язык из ответа сервера, если он есть
            const userLanguage = res.data.language;
            if (userLanguage && (userLanguage === 'en' || userLanguage === 'ru')) {
              i18n.changeLanguage(userLanguage);
            }
          } else {
            toast.error(res.message);
          }
        }
      }
    } catch (err: any) {
      console.log(err);
      // Проверяем, является ли ошибка ошибкой реферального кода
      const errorMessage = err?.message || err?.error || '';
      if (errorMessage.includes('Invalid referral code')) {
        // Сохраняем значение реферального кода, при котором была ошибка
        if (data.referralCode) {
          setInvalidReferralCode(data.referralCode);
        }
        setError({ referralCode: true });
        toast.error(t('registration.referralCode.invalid'));
      } else if (errorMessage) {
        toast.error(errorMessage);
      } else {
        toast.error(t('registration.error'));
      }
      setLoading(false);
    }
    setLoading(false);
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>{t('registration.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="name">{t('registration.name')}</FieldLabel>
            <Input
              value={data.name}
              onChange={(e) => change(e.target.value, 'name')}
              aria-invalid={error?.name ?? false}
              id="name"
              type="text"
              placeholder="John Doe"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              value={data.login}
              onChange={(e) => change(e.target.value, 'login')}
              aria-invalid={error?.login ?? false}
              id="email"
              type="email"
              placeholder="m@example.com"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">{t('registration.password')}</FieldLabel>
            <Input
              id="password"
              type="password"
              aria-invalid={error?.password ?? false}
              required
              value={data.password}
              onChange={(e) => change(e.target.value, 'password')}
            />
            <FieldDescription>{t('registration.password-help')}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="confirm-password">{t('registration.password-confirm')}</FieldLabel>
            <Input
              value={data.passwordConfirm}
              aria-invalid={error?.passwordConfirm ?? false}
              onChange={(e) => change(e.target.value, 'passwordConfirm')}
              id="confirm-password"
              type="password"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="referral-code">{t('registration.referralCode.label')}</FieldLabel>
            <Input
              value={data.referralCode}
              onChange={(e) => change(e.target.value, 'referralCode')}
              aria-invalid={error?.referralCode ?? false}
              id="referral-code"
              type="text"
              placeholder={t('registration.referralCode.placeholder')}
            />
            <FieldDescription>{t('registration.referralCode.description')}</FieldDescription>
          </Field>
          <Field>
            <div className="flex items-start gap-2">
              <Checkbox
                id="privacy-agreement"
                checked={privacyAgreed}
                onCheckedChange={(checked) => setPrivacyAgreed(checked === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="privacy-agreement"
                className="text-sm text-foreground leading-relaxed cursor-pointer"
              >
                {t('registration.privacyAgreement')}{' '}
                <Link
                  to="/privacy"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('registration.privacyPolicy')}
                </Link>
              </label>
            </div>
          </Field>
          <Field>
            <div className="flex items-start gap-2">
              <Checkbox
                id="data-processing-agreement"
                checked={dataProcessingAgreed}
                onCheckedChange={(checked) => setDataProcessingAgreed(checked === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="data-processing-agreement"
                className="text-sm text-foreground leading-relaxed cursor-pointer"
              >
                {t('registration.dataProcessingAgreement')}{' '}
                <Link
                  to="/consent"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('registration.dataProcessingConsent')}
                </Link>
              </label>
            </div>
          </Field>
          <FieldGroup>
            <Field>
              <Button
                disabled={loading || !privacyAgreed || !dataProcessingAgreed}
                onClick={registration}
                type="submit"
              >
                {t('registration.button')}
              </Button>
              <FieldDescription className="px-6 text-center">
                <Link to="/">{t('registration.link')}</Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
