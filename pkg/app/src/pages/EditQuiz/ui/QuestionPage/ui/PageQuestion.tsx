import { DownloadDrawer } from "@/components/dwonload-drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Quiz, QuizQuestionPage } from "@/entities/Quiz/quiz.type";
import { AuthContext } from "@/entities/User/auth.context";
import { CircleX, Image, Video } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const PageQuestion = ({
	question,
	setQuestion,
}: {
	question: Quiz["question"][0];
	setQuestion: (question: Quiz["question"][0]) => void;
}) => {
	const content = question?.content as QuizQuestionPage;
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [type, setType] = useState<"image" | "video">("image");
	const { user } = useContext(AuthContext);
	const [value, setValue] = useState<string>(content?.text ?? "");

	useEffect(() => {
		if (!content) {
			setQuestion({ ...question, content: { type: "img", url: "", text: "" } });
		}
	}, [content]);

	return (
		<div className={"flex flex-col gap-3"}>
			<Textarea
				placeholder={t(
					"edit-quiz.question-page.question.page.text.placeholder",
				)}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onBlur={() =>
					setQuestion({ ...question, content: { ...content, text: value } })
				}
			/>
			<div>
				{content?.url ? (
					<div className={"flex flex-col gap-2"}>
						{content.type === "img" ? (
							<img src={content.url} alt="image" width={820} height={820} />
						) : (
							<a href={content.url} target="_blank">
								<Button variant={"link"}>{content.url}</Button>
							</a>
						)}
						<div>
							<Button
								variant={"outline"}
								size={"icon-sm"}
								onClick={() => {
									setQuestion({
										...question,
										content: { ...content, url: "", type: "img" },
									});
								}}
							>
								<CircleX />
							</Button>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-2">
						<Tooltip>
							<TooltipTrigger>
								<Button
									variant={"outline"}
									size={"icon-sm"}
									onClick={() => {
										setType("image");
										setOpen(true);
									}}
								>
									<Image />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t("tooltip.add-image", { size: "820x820" })}</p>
							</TooltipContent>
						</Tooltip>
						<div>{t("edit-quiz.question-page.question.page.type.or")}</div>
						<Tooltip>
							<TooltipTrigger>
								<Button
									variant={"outline"}
									size={"icon-sm"}
									onClick={() => {
										setType("video");
										setOpen(true);
									}}
								>
									<Video />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{t("tooltip.add-video")}</p>
							</TooltipContent>
						</Tooltip>
					</div>
				)}
				<DownloadDrawer
					targetWidth={820}
					targetHeight={820}
					resize={true}
					disableDownload={user?.planId === 1}
					type={type}
					open={open}
					setOpen={setOpen}
					onFinal={(url) =>
						setQuestion({
							...question,
							content: {
								...content,
								url,
								type: type === "image" ? "img" : "video",
							},
						})
					}
				/>
			</div>
		</div>
	);
};
