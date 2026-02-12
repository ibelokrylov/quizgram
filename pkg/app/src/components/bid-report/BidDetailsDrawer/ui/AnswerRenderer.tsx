import { FileAnswer } from "./FilewAnswer";
import JsonAnswer from "./JsonAnswer";
import TextAnswerNew from "./new/TextAnswerNew";
import PageAnswer from "./PageAnswer";
import TextAnswer from "./TextAnswer";
import { VariantImageAnswer } from "./VariantImageAnswer";
import { VariantImageTextAnswer } from "./VariantImageTextAnswer";
import FileAnswerNew from "@/components/bid-report/BidDetailsDrawer/ui/new/FileAnswerNew.tsx";
import { DateAnswer } from "@/components/bid-report/BidDetailsDrawer/ui/DateAnswer.tsx";
import { Star } from "lucide-react";
import { format } from "date-fns";

const extractImageUrl = (answer: any): string | null => {
  return (
    answer?.url ||
    answer?.image_url ||
    answer?.imageUrl ||
    answer?.variant?.url ||
    answer?.selected?.url ||
    null
  );
};

const extractText = (answer: any): string | null => {
  return (
    answer?.text ||
    answer?.value ||
    answer?.label ||
    answer?.variant?.text ||
    answer?.variant?.value ||
    answer?.selected?.text ||
    answer?.selected?.value ||
    null
  );
};

const extractDateValue = (answer: any): string | null => {
  const str = answer?.date || answer?.value || answer?.selected || answer || null;
  return format(new Date(str), "dd.MM.yyyy");
};

const AnswerRenderer = ({
  answer,
  type,
  t,
  isNew,
}: {
  answer:
    | {
        files: [];
        answer: any;
      }
    | any;
  type: string;
  question?: any;
  t: (key: string) => string;
  isNew: boolean;
}) => {
  console.log(answer);
  switch (type) {
    case "variant_image": {
      const imageUrl = extractImageUrl(isNew ? answer.answer : answer);
      return imageUrl ? <VariantImageAnswer imageUrl={imageUrl} t={t} /> : null;
    }

    case "variant_image_text": {
      const imageUrl = extractImageUrl(isNew ? answer.answer : answer);
      const text = extractText(isNew ? answer.answer : answer);
      return <VariantImageTextAnswer imageUrl={imageUrl} text={text} t={t} />;
    }

    case "answer_option": {
      if (isNew) {
        return <TextAnswerNew text={answer.answer} />;
      }
      if (typeof answer.answer === "string") {
        return <TextAnswer text={answer} />;
      }
      // Если ответ - объект, извлекаем текст
      const text = extractText(answer) || answer;
      return text ? <TextAnswer text={typeof text === "string" ? text : String(text)} /> : null;
    }

    case "date": {
      if (isNew) {
        const v = extractDateValue(answer.answer);
        return v ? <DateAnswer dateValue={v} /> : null;
      }
      const dateValue = extractDateValue(answer);
      return dateValue ? <DateAnswer dateValue={dateValue} /> : null;
    }

    case "file":
      if (isNew) {
        return <FileAnswerNew answer={answer} />;
      }
      if (answer?.type === "file") {
        const fileUrl = answer?.url;
        const fileName = answer?.fileName || t("bids.details.file");
        return fileUrl ? <FileAnswer fileUrl={fileUrl} fileName={fileName} /> : null;
      }
      return <JsonAnswer answer={answer} />;

    case "page":
      if (isNew) {
        return <TextAnswer text={"Просмотрена"} />;
      }
      if (answer?.type === "page" || answer?.content) {
        const pageContent = answer?.content || answer;
        const text = pageContent?.text;
        const url = pageContent?.url;
        const contentType = pageContent?.type;
        return <PageAnswer text={text} url={url} contentType={contentType} t={t} />;
      }
      return <JsonAnswer answer={answer} />;
    case "rating":
      if (isNew) {
        return (
          <div className={"flex gap-2 items-center"}>
            <Star />
            <div>{answer.answer}</div>
          </div>
        );
      } else {
        return <TextAnswer text={answer} />;
      }

    default:
      // Проверяем, если это файл по структуре (answer.type === 'file')
      if (answer?.type === "file") {
        const fileUrl = answer?.url;
        const fileName = answer?.fileName || t("bids.details.file");
        return fileUrl ? <FileAnswer fileUrl={fileUrl} fileName={fileName} /> : null;
      }
      if (isNew) {
        if (typeof answer.answer === "string" || typeof answer.answer === "number")
          return <TextAnswer text={answer.answer} />;
      } else {
        if (typeof answer === "string" || typeof answer === "number")
          return <TextAnswer text={String(answer)} />;
      }
      return <JsonAnswer answer={answer} />;
  }
};

export default AnswerRenderer;
