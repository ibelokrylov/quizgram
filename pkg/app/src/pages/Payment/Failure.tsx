import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const PaymentFailurePage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <CardTitle>{t('payment.result.failure.title')}</CardTitle>
          <CardDescription>{t('payment.result.failure.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/app/payment">
            <Button variant="outline" className="w-full">
              {t('payment.result.failure.button')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};
