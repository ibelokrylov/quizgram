import ContactField from "./ContactField";

const ContactsSection = ({
  contacts,
  contactsForm,
  t,
}: {
  contacts: Record<string, string>;
  contactsForm?: any[] | null;
  t: (key: string) => string;
}) => (
  <div className="space-y-3 pt-4 border-t">
    <h3 className="font-semibold text-base lg:text-lg">
      {t("bids.details.contacts")}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {Object.entries(contacts).map(([key, value]) => (
        <ContactField
          key={key}
          contactKey={key}
          value={value}
          contactsForm={contactsForm}
        />
      ))}
    </div>
  </div>
);

export default ContactsSection;
