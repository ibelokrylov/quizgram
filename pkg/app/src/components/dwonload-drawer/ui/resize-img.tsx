import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import type { DownloadFile } from "@/entities/DownloadFile/download-file.type";
import http from "@/lib/http";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type ResizeMode = "cover" | "contain" | "fill";

interface ResizeImgProps {
	targetWidth: number;
	targetHeight: number;
	file: File;
	onFinal?: (url: string) => void;
	onCancel: () => void;
	onChangeLoading?: (loading: boolean) => void;
}

export const ResizeImg = ({
	targetWidth,
	targetHeight,
	file,
	onFinal,
	onCancel,
	onChangeLoading,
}: ResizeImgProps) => {
	const { t } = useTranslation();
	const [mode, setMode] = useState<ResizeMode>("cover");
	const [backgroundColor, setBackgroundColor] = useState("#ffffff");
	const [imageSize, setImageSize] = useState<{
		width: number;
		height: number;
	} | null>(null);
	const [previewUrl, setPreviewUrl] = useState<string>("");
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const imageRef = useRef<HTMLImageElement | null>(null);
	const [zoom, setZoom] = useState(1);
	const MIN_ZOOM = 0.5;
	const MAX_ZOOM = 3;

	const drawPreview = useCallback(
		(
			img: HTMLImageElement,
			resizeMode: ResizeMode,
			bgColor: string,
			customOffset = { x: 0, y: 0 },
			zoomLevel = 1,
		) => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			canvas.width = targetWidth;
			canvas.height = targetHeight;

			// Заливка фона
			ctx.fillStyle = bgColor;
			ctx.fillRect(0, 0, targetWidth, targetHeight);

			const targetRatio = targetWidth / targetHeight;
			const imgRatio = img.width / img.height;

			let drawWidth: number;
			let drawHeight: number;
			let offsetX = 0;
			let offsetY = 0;

			switch (resizeMode) {
				case "cover":
					// Заполнить весь canvas, обрезая лишнее
					// Теперь всегда применяем оба offset для возможности перемещения по обеим осям
					if (imgRatio > targetRatio) {
						drawHeight = targetHeight * zoomLevel;
						drawWidth = img.width * (targetHeight / img.height) * zoomLevel;
					} else {
						drawWidth = targetWidth * zoomLevel;
						drawHeight = img.height * (targetWidth / img.width) * zoomLevel;
					}
					// Центрируем изображение и добавляем пользовательский offset
					offsetX = (targetWidth - drawWidth) / 2 + customOffset.x;
					offsetY = (targetHeight - drawHeight) / 2 + customOffset.y;
					break;

				case "contain":
					// Вписать изображение полностью
					if (imgRatio > targetRatio) {
						drawWidth = targetWidth * zoomLevel;
						drawHeight = img.height * (targetWidth / img.width) * zoomLevel;
						offsetY = (targetHeight - drawHeight) / 2;
					} else {
						drawHeight = targetHeight * zoomLevel;
						drawWidth = img.width * (targetHeight / img.height) * zoomLevel;
						offsetX = (targetWidth - drawWidth) / 2;
					}
					break;

				case "fill":
					// Растянуть на весь canvas
					drawWidth = targetWidth;
					drawHeight = targetHeight;
					break;
			}

			ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

			// Сохраняем изображение для использования при drag
			imageRef.current = img;
		},
		[targetWidth, targetHeight],
	);

	useEffect(() => {
		const img = new Image();
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);

		img.onload = () => {
			setImageSize({ width: img.width, height: img.height });
			drawPreview(img, "cover", "#ffffff", { x: 0, y: 0 }, 1);
		};

		img.src = url;

		return () => {
			URL.revokeObjectURL(url);
		};
	}, [file, drawPreview]);

	useEffect(() => {
		if (previewUrl && imageSize) {
			const img = new Image();
			img.onload = () => {
				drawPreview(img, mode, backgroundColor, offset, zoom);
			};
			img.src = previewUrl;
		}
	}, [mode, backgroundColor, previewUrl, imageSize, drawPreview, offset, zoom]);

	// Сброс offset и zoom при смене режима
	useEffect(() => {
		setOffset({ x: 0, y: 0 });
		setZoom(1);
	}, [mode]);

	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (mode !== "cover") return;
		setIsDragging(true);
		setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDragging || mode !== "cover") return;

		const newOffset = {
			x: e.clientX - dragStart.x,
			y: e.clientY - dragStart.y,
		};

		// Ограничения для перемещения с учетом zoom - независимо по X и Y
		if (imageSize && imageRef.current) {
			const targetRatio = targetWidth / targetHeight;
			const imgRatio = imageSize.width / imageSize.height;

			// Рассчитываем размеры отрисовки изображения
			let drawWidth: number;
			let drawHeight: number;

			if (imgRatio > targetRatio) {
				// Изображение шире - базируемся на высоте
				drawHeight = targetHeight * zoom;
				drawWidth = imageSize.width * (targetHeight / imageSize.height) * zoom;
			} else {
				// Изображение выше - базируемся на ширине
				drawWidth = targetWidth * zoom;
				drawHeight = imageSize.height * (targetWidth / imageSize.width) * zoom;
			}

			// Ограничения по X
			const maxOffsetX = Math.max(0, (drawWidth - targetWidth) / 2);
			newOffset.x = Math.max(-maxOffsetX, Math.min(maxOffsetX, newOffset.x));

			// Ограничения по Y
			const maxOffsetY = Math.max(0, (drawHeight - targetHeight) / 2);
			newOffset.y = Math.max(-maxOffsetY, Math.min(maxOffsetY, newOffset.y));
		}

		setOffset(newOffset);
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleMouseLeave = () => {
		setIsDragging(false);
	};

	const handleUpload = async () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		onChangeLoading?.(true);
		try {
			// Конвертируем canvas в blob
			const blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(
					(blob) => {
						if (blob) {
							resolve(blob);
						} else {
							reject(new Error("Failed to create blob"));
						}
					},
					file.type,
					0.95,
				);
			});

			// Создаем новый файл из blob
			const resizedFile = new File([blob], file.name, { type: file.type });

			// Загружаем на сервер
			const formData = new FormData();
			formData.append("file", resizedFile);

			const res = await http<DownloadFile>({
				url: "/v1/user/upload-file",
				method: "POST",
				formData,
			});
			if (res.data) {
				onFinal?.(res.data.fileURL);
			}
		} catch (err) {
			console.error(err);
			toast.error(t("fileUpload.error.invalidFormat"));
		} finally {
			onChangeLoading?.(false);
		}
	};

	return (
		<div className="w-full px-4 py-2 pb-5 flex flex-col gap-4">
			<h1 className="text-2xl font-bold">{t("resizeImage.title")}</h1>

			<div className="flex flex-col gap-2">
				<p className="text-sm text-gray-600 dark:text-gray-400">
					{t("resizeImage.targetSize", {
						width: targetWidth,
						height: targetHeight,
					})}
				</p>
				{imageSize && (
					<p className="text-sm text-gray-600 dark:text-gray-400">
						{t("resizeImage.currentSize", {
							width: imageSize.width,
							height: imageSize.height,
						})}
					</p>
				)}
			</div>

			{/* Превью */}
			<div className="flex justify-center items-center border border-gray-200 dark:border-neutral-800 rounded-md p-4 bg-gray-50 dark:bg-neutral-900">
				<canvas
					ref={canvasRef}
					className="max-w-full h-auto"
					style={{
						maxHeight: "300px",
						cursor:
							mode === "cover" ? (isDragging ? "grabbing" : "grab") : "default",
					}}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseLeave}
				/>
			</div>

			{mode === "cover" && (
				<p className="text-xs text-gray-500 dark:text-gray-400 text-center">
					{t("resizeImage.dragToPosition")}
				</p>
			)}

			{/* Zoom slider */}
			{mode === "cover" && (
				<div className="flex flex-col gap-2">
					<Label>{t("resizeImage.zoom")}</Label>
					<div className="flex items-center gap-3">
						<ZoomOut className="size-4 text-gray-500 dark:text-gray-400 shrink-0" />
						<Slider
							value={[zoom]}
							onValueChange={(value: number[]) => setZoom(value[0])}
							min={MIN_ZOOM}
							max={MAX_ZOOM}
							step={0.1}
							className="flex-1"
						/>
						<ZoomIn className="size-4 text-gray-500 dark:text-gray-400 shrink-0" />
						<span className="text-sm text-gray-600 dark:text-gray-400 min-w-[3rem] text-right">
							{Math.round(zoom * 100)}%
						</span>
					</div>
				</div>
			)}

			{/* Режим изменения размера */}
			<div className="flex flex-col gap-2">
				<Label>{t("resizeImage.mode.cover")}</Label>
				<RadioGroup
					value={mode}
					onValueChange={(value: string) => setMode(value as ResizeMode)}
				>
					<div className="flex items-start space-x-2">
						<RadioGroupItem value="cover" id="cover" />
						<div className="flex flex-col">
							<Label htmlFor="cover" className="cursor-pointer">
								{t("resizeImage.mode.cover")}
							</Label>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{t("resizeImage.mode.cover.description")}
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<RadioGroupItem value="contain" id="contain" />
						<div className="flex flex-col">
							<Label htmlFor="contain" className="cursor-pointer">
								{t("resizeImage.mode.contain")}
							</Label>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{t("resizeImage.mode.contain.description")}
							</p>
						</div>
					</div>
					<div className="flex items-start space-x-2">
						<RadioGroupItem value="fill" id="fill" />
						<div className="flex flex-col">
							<Label htmlFor="fill" className="cursor-pointer">
								{t("resizeImage.mode.fill")}
							</Label>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								{t("resizeImage.mode.fill.description")}
							</p>
						</div>
					</div>
				</RadioGroup>
			</div>

			{/* Цвет фона (только для contain) */}
			{mode === "contain" && (
				<div className="flex flex-col gap-2">
					<Label htmlFor="bg-color">{t("resizeImage.backgroundColor")}</Label>
					<div className="flex gap-2 items-center">
						<input
							id="bg-color"
							type="color"
							value={backgroundColor}
							onChange={(e) => setBackgroundColor(e.target.value)}
							className="w-12 h-10 rounded border border-gray-200 dark:border-neutral-800 cursor-pointer"
						/>
						<input
							type="text"
							value={backgroundColor}
							onChange={(e) => setBackgroundColor(e.target.value)}
							className="flex-1 px-3 py-2 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm"
						/>
					</div>
				</div>
			)}

			{/* Кнопки действий */}
			<div className="flex gap-2 justify-end">
				<Button variant="outline" onClick={onCancel}>
					{t("resizeImage.cancel")}
				</Button>
				<Button onClick={handleUpload}>{t("resizeImage.upload")}</Button>
			</div>
		</div>
	);
};
