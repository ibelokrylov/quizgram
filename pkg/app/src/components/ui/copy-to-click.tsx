import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export const CopyToClick = ({
  text,
  children,
  as: Component = 'div',
}: {
  text: string;
  children: React.ReactNode;
  as?: React.ElementType;
}) => {
  const { t } = useTranslation();
  function copyToClick() {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success(t('tooltip.copy'));
      })
      .catch((e) => {
        toast.error(t('tooltip.copy-error'));
        console.error(e);
      });
  }
  return (
    <Component className="cursor-pointer" onClick={copyToClick}>
      {children}
    </Component>
  );
};
