import { DownloadDrawer } from "@/components/dwonload-drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyToClick } from "@/components/ui/copy-to-click";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TextAreaNoBorder } from "@/components/ui/textarea-no-border";
import type { QuizContact, QuizContactForm, QuizContactFormType } from "@/entities/Quiz/quiz.type";
import { cn } from "@/lib/utils";
import { Plus, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ContactDrawer } from "./ContactDrawer";

export const ContactEditForm = ({
  contact,
  setContact,
}: {
  contact: QuizContact;
  setContact: (contact: QuizContact) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);
  const [title, setTitle] = useState(contact.title ?? "");
  const [description, setDescription] = useState(contact.description ?? "");
  const { t } = useTranslation();

  // Синхронизация локальных state с пропсом contact
  useEffect(() => {
    setTitle(contact.title ?? "");
    setDescription(contact.description ?? "");
  }, [contact.title, contact.description]);

  function onFinal(url: string) {
    setContact({ ...contact, background: url });
  }

  function addToForm(form: QuizContactForm) {
    const oldForm = contact.form ?? [];
    oldForm.push(form);
    setContact({ ...contact, form: oldForm });
    setAddDrawerOpen(false);
  }

  return (
    <div className={"flex flex-col gap-1 py-2 px-0.5"}>
      {/* <div>
        <Button
          variant={'outline'}
          size={'icon-sm'}
        >
          <Trash />
        </Button>
      </div> */}
      <Card className={"max-w-none sm:max-w-[414px] w-full min-h-[800px] relative p-0"}>
        <div className={"absolute top-[-16px] right-2 w-fit"}>
          <CopyToClick text={contact.uid}>
            <div className={"text-xs text-gray-200 dark:text-gray-600"}>id: {contact.uid}</div>
          </CopyToClick>
        </div>
        <div className={"flex flex-col items-center justify-center min-h-[800px] px-3 py-2"}>
          <Card className={"px-2 py-3 w-full h-fit relative"}>
            <div className={"flex flex-col gap-2 w-full"}>
              <TextAreaNoBorder
                fontSize={20}
                maxWidth={330}
                maxLength={50}
                fixedWidth={330}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setContact({ ...contact, title })}
                placeholder={t("edit-quiz.contacts-page.contact.placeholder.title")}
              />
              <TextAreaNoBorder
                value={description}
                fixedWidth={330}
                maxLength={150}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setContact({ ...contact, description })}
                placeholder={t("edit-quiz.contacts-page.contact.placeholder.description")}
              />
            </div>
            <Separator />
            <div className={"flex flex-col gap-4"}>
              {contact.form?.map((form) => (
                <div key={form.type} className={"flex flex-col gap-1 relative group"}>
                  <Label htmlFor={form.label}>
                    {form.label}
                    {form.required ? <span className={"text-red-500"}>*</span> : null}
                  </Label>
                  <Input id={form.label} placeholder={form.placeholder} />
                  <div>
                    <Button
                      variant={"outline"}
                      size={"icon-sm"}
                      className={cn(
                        "absolute top-5 right-0 hidden group-hover:inline-flex hover:text-destructive"
                      )}
                      onClick={() =>
                        setContact({
                          ...contact,
                          form: contact.form?.filter((f) => f.label !== form.label),
                        })
                      }
                    >
                      <Trash />
                    </Button>
                  </div>
                </div>
              ))}
              <div>
                <Button
                  variant={"link"}
                  className={"text-sm text-gray-500 dark:text-gray-400"}
                  onClick={() => setAddDrawerOpen(true)}
                >
                  <Plus />
                  {t("edit-quiz.contacts-page.contact.button.add-field")}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Card>
      <ContactDrawer
        changeForm={addToForm}
        currentAddedFields={
          new Set(contact.form?.map((f) => f.type) ?? ([] as QuizContactFormType[]))
        }
        open={addDrawerOpen}
        setOpen={setAddDrawerOpen}
      />
      <DownloadDrawer type="image" open={open} setOpen={setOpen} onFinal={onFinal} />
    </div>
  );
};
