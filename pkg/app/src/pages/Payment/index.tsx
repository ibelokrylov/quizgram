import { useTranslation } from "react-i18next";

export const PaymentPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">{t("payment.title")}</h1>
        <p className="text-muted-foreground">{t("payment.description")}</p>
      </div>
    </div>
  );
};
