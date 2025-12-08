import { z } from "zod";

export const quizContactFormType = z.enum(["name", "email", "phone", "text"]);
export const quizContactFormZod = z.object({
  type: quizContactFormType,
  label: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  mask: z.string().optional(),
  step: z.number().optional(),
});
export const quizContactZod = z.object({
  uid: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  background: z.string().optional(),
  form: z.array(quizContactFormZod).optional(),
});

export type QuizContactFormType = z.infer<typeof quizContactFormType>;

export const quizThxPageSocialZod = z.object({
  type: z.string(),
  link: z.string(),
});
export type QuizThxPageSocial = z.infer<typeof quizThxPageSocialZod>;
export const quizThxPageZod = z.object({
  uid: z.string(),
  title: z.string(),
  description: z.string(),
  buttons: z
    .array(
      z.object({
        title: z.string(),
        link: z.string(),
      }),
    )
    .optional(),
  social: z.array(quizThxPageSocialZod).optional(),
});
export type QuizThxPage = z.infer<typeof quizThxPageZod>;

export const quizZod = z.object({
  uid: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  opened: z.number(),
  full: z.number(),
  isActive: z.boolean(),
  name: z.string(),
  thxPage: quizThxPageZod.optional(),
  questionTitle: z.string().optional(),
  contact: z.array(quizContactZod).optional(),
  question: z.array(
    z.object({
      type: z
        .enum([
          "answer_option",
          "variant_image",
          "variant_image_text",
          "emoji",
          "input",
          "select",
          "date",
          "slide",
          "file",
          "page",
          "rating",
          "question_group",
        ])
        .optional(),
      uid: z.string(),
      content: z.any().optional(),
    }),
  ),
  startPage: z
    .object({
      type: z.enum(["standard", "site"]),
      content: z.any().optional(),
    })
    .optional(),
});

export const quizStartPageStandardZod = z.object({
  logo_url: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  button: z.string().optional(),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  company_description: z.string().optional(),
  background: z.string().optional(),
  background_mobile: z.string().optional(),
  background_type: z.enum(["image", "video"]),
  type: z.enum(["standard", "center", "all"]),
  content_align: z.enum(["center", "left", "right"]),
  show_logo: z.boolean(),
  link: z.string().optional(),
  disclamer: z.string().optional(),
});

export const quizStartPageSiteZod = z.object({
  logo: z.string().optional(),
  company_name: z.string().optional(),
  company_description: z.string().optional(),
  content: z
    .array(
      z.object({
        order: z.number(),
        value: z.string(),
      }),
    )
    .optional(),
  social: z
    .array(
      z.object({
        type: z.enum([
          "instagram",
          "vk",
          "youtube",
          "facebook",
          "x",
          "telegram",
          "tiktok",
          "wechat",
          "whatsapp",
          "linkedin",
          "email",
        ]),
        value: z.string(),
      }),
    )
    .optional(),
  phone: z.string().optional(),
  disclamer: z.string().optional(),
  footer: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
});

export const quizQuestionAnswerOptionsZod = z.object({
  title: z.string(),
  variants: z.array(z.string()),
});

export const quizQuestionVariantImageZod = z.object({
  title: z.string(),
  variants: z.array(
    z.object({
      url: z.string(),
      value: z.string().optional(),
    }),
  ),
});

export const quizQuestionVariantImageTextItemZod = z.object({
  url: z.string(),
  value: z.string(),
});

export const quizQuestionVariantImageTextZod = z.object({
  title: z.string(),
  variants: z.array(quizQuestionVariantImageTextItemZod),
});

export const quizQuestionEmojiZod = z.object({
  title: z.string(),
  variants: z.array(z.string()),
});

export const quizQuestionInputZod = z.object({
  title: z.string(),
  variant: z.string(),
});

export const quizQuestionSelectZod = z.object({
  title: z.string(),
  variants: z.array(z.string()),
});

export const quizQuestionDateZod = z.object({
  title: z.string(),
  type: z.enum(["calendar", "mask"]),
});

export const quizQuestionSlideOptionsZod = z.object({
  start: z.number(),
  end: z.number(),
  default_select: z.number(),
  step: z.number(),
});

export const quizQuestionSlideZod = z.object({
  title: z.string(),
  options: quizQuestionSlideOptionsZod,
});

export const quizQuestionFileZod = z.object({
  title: z.string(),
  type: z.enum(["all", "image", "video", "docs"]),
});

export const quizQuestionPageZod = z.object({
  title: z.string(),
  type: z.enum(["img", "video"]),
  url: z.string().optional(),
  text: z.string().optional(),
});

export const quizQuestionRatingZod = z.object({
  title: z.string(),
  left_placeholder: z.string(),
  right_placeholder: z.string(),
});

export const quizQuestionGroupZod = z.object({
  title: z.string(),
  questions: z.any(),
});

export type QuizQuestionGroup = {
  title: string;
  questions: QuizQuestion[];
};

export type QuizQuestionType =
  | "answer_option"
  | "variant_image"
  | "variant_image_text"
  // | 'emoji'
  | "input"
  | "select"
  | "date"
  | "slide"
  | "file"
  | "page"
  | "rating"
  | "question_group";
export type Quiz = z.infer<typeof quizZod>;
export type QuizDashboard = Pick<
  Quiz,
  "uid" | "name" | "opened" | "full" | "is_active" | "created_at" | "updated_at"
>;
// Select("uid", "name", "opened", "full", "is_active", "created_at", "updated_at").

export type QuizContact = z.infer<typeof quizContactZod>;
export type QuizContactForm = z.infer<typeof quizContactFormZod>;

export type QuizStartPage =
  | {
    type: "standard";
    content?: QuizStartPageStandard;
  }
  | {
    type: "site";
    content?: QuizStartPageSite;
  };

export type QuizStartPageStandard = z.infer<typeof quizStartPageStandardZod>;
export type QuizStartPageSite = z.infer<typeof quizStartPageSiteZod>;

export type QuizQuestion =
  | {
    type: "answer_option";
    uid: string;
    order: number;
    content?: QuizQuestionAnswerOptions[];
  }
  | {
    type: "variant_image";
    uid: string;
    order: number;
    content?: QuizQuestionVariantImage;
  }
  | {
    type: "variant_image_text";
    uid: string;
    order: number;
    content?: QuizQuestionVariantImageText;
  }
  | {
    type: "emoji";
    uid: string;
    order: number;
    content?: QuizQuestionEmoji;
  }
  | {
    type: "input";
    uid: string;
    order: number;
    content?: QuizQuestionInput;
  }
  | {
    type: "select";
    uid: string;
    order: number;
    content?: QuizQuestionSelect;
  }
  | {
    type: "date";
    uid: string;
    order: number;
    content?: QuizQuestionDate;
  }
  | {
    type: "slide";
    uid: string;
    order: number;
    content?: QuizQuestionSlide;
  }
  | {
    type: "file";
    uid: string;
    order: number;
    content?: QuizQuestionFile;
  }
  | {
    type: "page";
    uid: string;
    order: number;
    content?: QuizQuestionPage;
  }
  | {
    type: "rating";
    uid: string;
    order: number;
    content?: QuizQuestionRating;
  }
  | {
    type: "question_group";
    uid: string;
    order: number;
    content?: QuizQuestion[];
  };

export type QuizQuestionAnswerOptions = z.infer<
  typeof quizQuestionAnswerOptionsZod
>;
export type QuizQuestionVariantImage = z.infer<
  typeof quizQuestionVariantImageZod
>;
export type QuizQuestionVariantImageText = z.infer<
  typeof quizQuestionVariantImageTextZod
>;
export type QuizQuestionEmoji = z.infer<typeof quizQuestionEmojiZod>;
export type QuizQuestionInput = z.infer<typeof quizQuestionInputZod>;
export type QuizQuestionSelect = z.infer<typeof quizQuestionSelectZod>;
export type QuizQuestionDate = z.infer<typeof quizQuestionDateZod>;
export type QuizQuestionSlide = z.infer<typeof quizQuestionSlideZod>;
export type QuizQuestionFile = z.infer<typeof quizQuestionFileZod>;
export type QuizQuestionPage = z.infer<typeof quizQuestionPageZod>;
export type QuizQuestionRating = z.infer<typeof quizQuestionRatingZod>;
