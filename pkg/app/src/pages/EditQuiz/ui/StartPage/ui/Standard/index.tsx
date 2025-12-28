import { DownloadFiles } from "@/components/download-files";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateQuizContext } from "@/entities/Quiz/CreateQuiz.context";
import type { Quiz, QuizStartPageStandard } from "@/entities/Quiz/quiz.type";
import { AuthContext } from "@/entities/User/auth.context";
import http from "@/lib/http";
import { ArrowDownFromLine, Trash } from "lucide-react";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";

// export const quizStartPageStandardZod = z.object({
//   logo_url: z.string().optional(),
//   name: z.string().optional(),
//   title: z.string().optional(),
//   description: z.string().optional(),
//   button: z.string().optional(),
//   phone: z.string().optional(),
//   company_name: z.string().optional(),
//   company_description: z.string().optional(),
//   background: z.string().optional(),
//   background_type: z.enum(['image', 'video']),
//   type: z.enum(['standard', 'center', 'all']),
//   content_align: z.enum(['center', 'left', 'right']),
// })

const defaultPage: QuizStartPageStandard = {
  logo_url: undefined,
  name: undefined,
  link: undefined,
  title: undefined,
  description: undefined,
  button: undefined,
  phone: undefined,
  company_name: undefined,
  company_description: undefined,
  background: undefined,
  background_type: "image",
  background_mobile: undefined,
  type: "standard",
  content_align: "left",
  show_logo: true,
  disclamer: undefined,
};

export const Standard = () => {
  const { quiz, setQuiz } = useContext(CreateQuizContext);
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();

  const startPage = quiz?.startPage?.content as QuizStartPageStandard;
  const [page, setPage] = useState<QuizStartPageStandard>({
    ...defaultPage,
    ...(startPage ?? {}),
  });

  function changePage(page: QuizStartPageStandard) {
    setPage(page);
    console.log("123", page);
    setQuiz({
      ...quiz,
      startPage: { ...quiz?.startPage, content: page },
    } as Quiz);
  }

  async function deleteFile(url: string, changeLoading?: (loading: boolean) => void) {
    try {
      changeLoading?.(true);
      await http({
        url: "/v1/user/delete-file",
        method: "DELETE",
        body: { file_url: url },
      });
    } catch (err) {
      console.log(err);
    } finally {
      changeLoading?.(false);
    }
  }

  async function deleteLogo() {
    if (!page?.logo_url) return;
    await deleteFile(page?.logo_url);
    changePage({ ...page, logo_url: undefined });
  }

  async function deletePage() {
    setQuiz({ ...quiz, startPage: undefined } as Quiz);
  }

  // function handleBackgroundTypeChange(value: boolean) {
  //   changePage({ ...page, background_type: value ? 'video' : 'image', background_mobile: undefined, background: undefined });
  // }

  return (
    <div className="flex flex-col gap-4 px-2 lg:px-0">
      <Card className={"p-2 max-w-[400px] w-full"}>
        <div className="col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                {page?.logo_url ? (
                  <div className="w-[40px] h-[40px] block relative group">
                    <img
                      src={page?.logo_url}
                      alt="logo"
                      className="w-[40px] h-[40px] object-cover block rounded-md"
                    />
                    <Button
                      className="absolute top-2 left-2 size-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      variant={"destructive"}
                      size={"icon"}
                      onClick={deleteLogo}
                    >
                      <Trash />
                    </Button>
                  </div>
                ) : (
                  <DownloadFiles
                    resize={{ width: 40, height: 40 }}
                    image={page?.logo_url}
                    className="w-[40px] h-[40px] relative"
                    showDownloadMobile={false}
                    classNamePreview="w-[40px] h-[40px] relative"
                    onFinal={(value) => changePage({ ...page, logo_url: value })}
                    icon={<ArrowDownFromLine size={20} className={"ml-[-2px] mt-[-1px]"} />}
                    tooltipMobile={t("downloadImage.standard.logo_info")}
                  />
                )}
              </TooltipTrigger>
              <TooltipContent>{t("edit-quiz.start-page.standard.edit.logo_info")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  className="w-[calc(100%-60px)]"
                  value={page?.name}
                  onChange={(e) => changePage({ ...page, name: e.target.value })}
                  placeholder={t("edit-quiz.start-page.standard.companyName")}
                />
              </TooltipTrigger>
              <TooltipContent>
                {t("edit-quiz.start-page.standard.edit.company_name_info")}
              </TooltipContent>
            </Tooltip>
          </div>
          <Separator />
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  value={page?.title}
                  onChange={(e) => changePage({ ...page, title: e.target.value })}
                  placeholder={t("edit-quiz.start-page.standard.edit.title")}
                />
              </TooltipTrigger>
              <TooltipContent>{t("edit-quiz.start-page.standard.edit.title_info")}</TooltipContent>
            </Tooltip>
          </div>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  value={page?.description}
                  onChange={(e) => changePage({ ...page, description: e.target.value })}
                  placeholder={t("edit-quiz.start-page.standard.edit.description")}
                />
              </TooltipTrigger>
              <TooltipContent>
                {t("edit-quiz.start-page.standard.edit.description_info")}
              </TooltipContent>
            </Tooltip>
          </div>
          <Separator />
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  value={page?.button}
                  onChange={(e) => changePage({ ...page, button: e.target.value })}
                  placeholder={t("edit-quiz.start-page.standard.edit.button")}
                />
              </TooltipTrigger>
              <TooltipContent>{t("edit-quiz.start-page.standard.edit.button_info")}</TooltipContent>
            </Tooltip>
          </div>
          <Separator />
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  value={page?.phone}
                  onChange={(e) => changePage({ ...page, phone: e.target.value })}
                  placeholder={t("edit-quiz.start-page.standard.edit.phone")}
                />
              </TooltipTrigger>
              <TooltipContent>{t("edit-quiz.start-page.standard.edit.phone_info")}</TooltipContent>
            </Tooltip>
          </div>
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  value={page?.company_name}
                  onChange={(e) => changePage({ ...page, company_name: e.target.value })}
                  placeholder={t("edit-quiz.start-page.standard.edit.company_name")}
                />
              </TooltipTrigger>
              <TooltipContent>
                {t("edit-quiz.start-page.standard.edit.company_name_info")}
              </TooltipContent>
            </Tooltip>
          </div>
          <Separator />
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Input
                  value={page?.disclamer}
                  onChange={(e) => changePage({ ...page, disclamer: e.target.value })}
                  placeholder={t("edit-quiz.start-page.standard.edit.disclamer")}
                />
              </TooltipTrigger>
              <TooltipContent>
                {t("edit-quiz.start-page.standard.edit.disclamer_info")}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </Card>
      <Separator />
      <div>
        <Button variant={"destructive"} onClick={deletePage}>
          {t("edit-quiz.start-page.standard.edit.delete")}
          <Trash />
        </Button>
      </div>
      {/* <div>Show preview telegram</div> */}
      {/* <div>Show preview web</div> */}
    </div>
  );
};
