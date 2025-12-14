import { cn } from "@/lib/utils";
import { ImageOff, MonitorDown, Trash, Wallpaper } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DownloadDrawer } from "./dwonload-drawer";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const DownloadFiles = ({
	showDownloadMobile = true,
	onChangeLoading,
	onFinal,
	type = "image",
	...props
}: {
	resize?: {
		width: number;
		height: number;
	};
	type?: "image" | "video";
	image?: string;
	mobileImage?: string;
	tooltipWeb?: string;
	tooltipMobile?: string;
	className?: string;
	showDownloadMobile?: boolean;
	onChangeLoading?: (loading: boolean) => void;
	onFinal?: (value: string, type: "image" | "mobile") => void;
	deleteImage?: (type: "image" | "mobile") => void;
	classNameIconWallpaper?: string;
	icon?: React.ReactNode;
	classNamePreview?: string;
	disableDownload?: boolean;
}) => {
	const { t } = useTranslation();

	const [open, setOpen] = useState(false);
	const [typeDownload, setTypeDownload] = useState<"image" | "mobile">("image");

	const handleDownloadImage = (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setOpen(true);
		setTypeDownload("image");
		console.log(123);
	};

	const handleDownloadMobileImage = (e: React.MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setTypeDownload("mobile");
		setOpen(true);
	};

	const mainClassName = cn(
		"w-full h-full bg-gray-200 dark:bg-neutral-800 rounded-md p-3 cursor-pointer",
		props.className,
	);

	return (
		<div className="relative">
			<div className="flex gap-2 absolute top-3 left-3 z-10">
				{showDownloadMobile && !props.image ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={"outline"}
								size={"icon"}
								onClick={handleDownloadImage}
							>
								<MonitorDown />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{props.tooltipWeb ?? t(`downloadImage.standard.${type}.web`)}
						</TooltipContent>
					</Tooltip>
				) : null}
				{props.mobileImage ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={"destructive"}
								size={"icon"}
								onClick={() => props?.deleteImage?.("mobile")}
							>
								<Trash />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{t("downloadImage.standard.delete.mobile")}
						</TooltipContent>
					</Tooltip>
				) : null}
				{props.image ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant={"destructive"}
								size={"icon"}
								onClick={() => props?.deleteImage?.("image")}
							>
								<ImageOff />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{t("downloadImage.standard.delete.mobile")}
						</TooltipContent>
					</Tooltip>
				) : null}
			</div>
			{props.mobileImage ? (
				<div className={cn(mainClassName, "overflow-hidden relative")}>
					{type === "video" ? (
						<video
							src={props.mobileImage}
							autoPlay
							muted
							loop
							className="absolute inset-0 w-full h-full object-cover rounded-md z-0"
						/>
					) : null}
					{type === "image" ? (
						<img
							src={props.mobileImage}
							alt="image"
							className="absolute inset-0 w-full h-full object-cover rounded-md z-0"
						/>
					) : null}
				</div>
			) : (
				<Tooltip>
					<TooltipTrigger asChild>
						<div
							className={cn(mainClassName, props.classNamePreview)}
							onClick={handleDownloadMobileImage}
						>
							{props.icon ?? (
								<Wallpaper
									className={cn(
										"size-10 text-gray-500 dark:text-neutral-400 mx-auto absolute top-1/2 left-1/2 -translate-x-1/2",
										props.classNameIconWallpaper,
									)}
								/>
							)}
						</div>
					</TooltipTrigger>
					<TooltipContent>
						{props.tooltipMobile ?? t(`downloadImage.standard.${type}.mobile`)}
					</TooltipContent>
				</Tooltip>
			)}
			<DownloadDrawer
				defaultUrl={type === "video" ? props.mobileImage : undefined}
				disableDownload={props.disableDownload}
				onChangeLoading={onChangeLoading}
				onFinal={(value) => onFinal?.(value, typeDownload)}
				type={type}
				open={open}
				setOpen={setOpen}
				resize={!!props.resize}
				targetWidth={props.resize?.width}
				targetHeight={props.resize?.height}
			/>
		</div>
	);
};
