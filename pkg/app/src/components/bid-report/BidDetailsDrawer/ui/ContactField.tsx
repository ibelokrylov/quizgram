export interface ContactFieldProps {
  contactKey: string;
  value: string;
  contactsForm?: any[] | null;
}

export const formatPhoneNumber = (value: string): string => {
  return value.startsWith("+") ? value : `+${value}`;
};

const ContactField = ({
  contactKey,
  value,
  contactsForm,
}: ContactFieldProps) => {
  const fieldInfo = contactsForm?.find(
    (field: any) => field.type === contactKey,
  );
  const label = fieldInfo?.label || contactKey;
  const displayValue =
    contactKey === "phone" ? formatPhoneNumber(value) : value;

  return (
    <div>
      <p className="text-xs lg:text-sm text-muted-foreground">{label}</p>
      <p className="text-sm lg:text-base font-medium">{displayValue}</p>
    </div>
  );
};

export default ContactField;
