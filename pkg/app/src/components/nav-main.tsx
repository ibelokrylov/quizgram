import { IconCirclePlusFilled } from "@tabler/icons-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CreateQuizContext } from "@/entities/Quiz/CreateQuiz.context";
import type { Quiz } from "@/entities/Quiz/quiz.type";
import http from "@/lib/http";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: React.ReactNode;
  }[];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const { setQuiz } = useContext(CreateQuizContext);

  async function createQuiz() {
    try {
      const res = await http<Quiz>({ url: "/v1/quiz", method: "POST" });
      setQuiz(res.data);
      navigate({ to: "/app/quiz/$uid", params: { uid: res.data.uid } });
    } catch (err) {
      toast.error("error message");
      console.log(err);
    }
  }
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t("nav.quiz.title")}</SidebarGroupLabel>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              onClick={createQuiz}
              tooltip="Quick Create"
              className="bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground active:bg-accent/90 active:text-accent-foreground min-w-8 duration-200 ease-linear"
            >
              <IconCirclePlusFilled />
              <span>{t("nav.quiz.create")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item) => {
            // Проверяем точное совпадение пути (без учета query параметров)
            const isActive = location.pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <Link to={item.url}>
                  <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                    {item.icon}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
