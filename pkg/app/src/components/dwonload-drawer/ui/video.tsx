import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Message } from "@/components/ui/message";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Download, Save } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import z from "zod";

const videoSchema = z.object({
  url: z.string().url(),
});

export const Video = ({
  disableDownload = false,
  ...props
}: {
  disableDownload?: boolean;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleClick: () => void;
  onFinal?: (url: string) => void;
  onClose?: () => void;
  defaultUrl?: string;
}) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState(props.defaultUrl || "");
  const [error, setError] = useState<boolean>(false);

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(false);
    setUrl(e.target.value);
  }

  function saveUrl() {
    const data = videoSchema.safeParse({ url });
    if (data.success) {
      props.onFinal?.(data.data.url);
      props.onClose?.();
    } else {
      setError(true);
      toast.error(t("downloadVideo.urlInvalid"));
    }
  }

  return (
    <div className="w-full px-4 py-2 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("downloadVideo.title")}</h1>
      <Tabs defaultValue="url" className="w-full">
        <TabsList>
          <TabsTrigger value="url">{t("downloadVideo.url")}</TabsTrigger>
          {disableDownload ? (
            <Tooltip>
              <TooltipTrigger>
                <TabsTrigger disabled={disableDownload} value="file">
                  {t("downloadVideo.file")}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("downloadVideo.fileTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <TabsTrigger disabled={disableDownload} value="file">
              {t("downloadVideo.file")}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="url">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={url}
                placeholder={t("downloadVideo.url")}
                onChange={handleUrlChange}
                aria-invalid={error}
              />
              <Button variant="outline" onClick={saveUrl} size={"icon"} disabled={!url}>
                <Save />
              </Button>
            </div>
            <Message variant="info">{t("downloadVideo.urlTooltip")}</Message>
          </div>
        </TabsContent>
        <TabsContent value="file">
          <div
            onDragOver={props.handleDragOver}
            onDrop={props.handleDrop}
            onClick={props.handleClick}
            className={
              "flex gap-3 items-center px-4 py-2 rounded-md border border-gray-200 dark:border-neutral-800 border-dashed cursor-pointer"
            }
          >
            <div>
              <Download size={32} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                {t("downloadVideo.dragAndDrop")}
              </p>
              <p className="text-xs text-gray-500 dark:text-neutral-400">
                {t("downloadVideo.dragAndDropDescription")}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
