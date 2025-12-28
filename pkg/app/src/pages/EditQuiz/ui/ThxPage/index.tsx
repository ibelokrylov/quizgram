import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextAreaNoBorder } from "@/components/ui/textarea-no-border";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateQuizContext } from "@/entities/Quiz/CreateQuiz.context";
import type { Quiz, QuizThxPage } from "@/entities/Quiz/quiz.type";
import { CirclePower, Info, Link, Settings, Twitter } from "lucide-react";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { AiFillWechat } from "react-icons/ai";
import { CiCirclePlus } from "react-icons/ci";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaTelegramPlane,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";
import { FaTiktok, FaXTwitter } from "react-icons/fa6";
import { IoLogoVk } from "react-icons/io";
import { IoMailOutline } from "react-icons/io5";
import { v7 } from "uuid";
import { ButtonsEditor } from "./ui/ButtonsEditor";
import { SocialEditor } from "./ui/SocialEditor";

// const socialList = ['Instagram', 'Vk', 'Youtube', 'Facebook', 'X', 'Telegram', 'Tiktok', 'Wechat', 'WhatsApp', 'LinkedIn', 'E-mail'];
const socialIcons = {
  Instagram: <FaInstagram />,
  Vk: <IoLogoVk />,
  Youtube: <FaYoutube />,
  Facebook: <FaFacebook />,
  X: <FaXTwitter />,
  Telegram: <FaTelegramPlane />,
  Tiktok: <FaTiktok />,
  Wechat: <AiFillWechat />,
  WhatsApp: <FaWhatsapp />,
  LinkedIn: <FaLinkedin />,
  "E-mail": <IoMailOutline />,
};

export const ThxPage = () => {
  const { t } = useTranslation();
  const { quiz, setQuiz } = useContext(CreateQuizContext);
  const [openK, setOpenK] = useState(v7());

  const [openButtons, setOpenButtons] = useState(false);
  const [openSocial, setOpenSocial] = useState(false);
  const [openSocialK, setOpenSocialK] = useState(v7());

  const content: QuizThxPage | undefined = quiz?.thxPage;

  return (
    <div className={"px-2 sm:px-4"}>
      <Card className="flex flex-col items-center justify-center p-2 max-w-none px-2 sm:max-w-[414px] min-h-[800px] w-full">
        <Card className="max-w-none w-full mr-2 ml-2 flex flex-col gap-5 px-3 py-2">
          <div className={"relative"}>
            <div className={"absolute top-[10px] left-[-20px]"}>
              <Tooltip>
                <TooltipTrigger>
                  <Info />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("edit-quiz.thx-page.title_info")}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <TextAreaNoBorder
              value={content?.title}
              fontSize={20}
              maxLength={60}
              onChange={(e) =>
                setQuiz({
                  ...quiz,
                  thxPage: { ...content, title: e.target.value },
                } as Quiz)
              }
              fixedWidth={386}
            />
          </div>
          <TextAreaNoBorder
            value={content?.description}
            fontSize={16}
            maxLength={250}
            onChange={(e) =>
              setQuiz({
                ...quiz,
                thxPage: { ...content, description: e.target.value },
              } as Quiz)
            }
            fixedWidth={386}
          />
          <div className="flex justify-center w-full">
            {content?.buttons?.length ? (
              <div className="flex flex-col gap-2 items-center w-full">
                {content.buttons.map((i) => (
                  <Card className="flex gap-2 items-center relative w-full p-2 group" key={v7()}>
                    {i.title}
                    <div className={"absolute left-2 top-[50%] translate-y-[-50%]"}>
                      <Link size={16} />
                    </div>
                    <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant={"outline"}
                        size={"icon-sm"}
                        onClick={() => {
                          setOpenButtons(true);
                          setOpenK(v7());
                        }}
                      >
                        <Settings />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Button
                variant={"outline"}
                onClick={() => {
                  setOpenButtons(true);
                  setOpenK(v7());
                }}
              >
                {t("edit-quiz.thx-page.button.add")}
                <CirclePower />
              </Button>
            )}
          </div>
          <div>
            {content?.social?.length ? (
              <div
                className={
                  "flex items-center flex-wrap justify-center gap-3 relative w-fit mx-auto"
                }
              >
                {content.social.map((i) => (
                  <div key={i.type}>
                    <Button variant={"outline"}>
                      {socialIcons[i.type as keyof typeof socialIcons]}
                    </Button>
                  </div>
                ))}
                <div className={"absolute right-[-40px] top-0"}>
                  <Button variant={"outline"} size={"icon-sm"} onClick={() => setOpenSocial(true)}>
                    <CiCirclePlus />
                  </Button>
                </div>
              </div>
            ) : (
              <div className={"flex justify-center w-full"}>
                <Button variant={"outline"} onClick={() => setOpenSocial(true)}>
                  {t("edit-quiz.thx-page.social.add")}
                  <Twitter />
                </Button>
              </div>
            )}
          </div>
        </Card>
      </Card>
      <ButtonsEditor
        key={openK}
        buttons={content?.buttons}
        setButtons={(buttons) => setQuiz({ ...quiz, thxPage: { ...content, buttons } } as Quiz)}
        open={openButtons}
        setOpen={setOpenButtons}
      />
      <SocialEditor
        key={openSocialK}
        social={content?.social ?? []}
        setSocial={(social) => setQuiz({ ...quiz, thxPage: { ...content, social } } as Quiz)}
        open={openSocial}
        setOpen={() => {
          setOpenSocial(false);
          setOpenSocialK(v7());
        }}
      />
    </div>
  );
};
