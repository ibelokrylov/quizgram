import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { Pen } from "lucide-react";
import * as React from "react";

interface InputNoBorderProps extends HTMLMotionProps<"input"> {
	initialWidth?: number;
	maxWidth?: number;
	maxLength?: number;
	fontSize?: string | number;
}

function InputNoBorder({
	className,
	type,
	value,
	defaultValue,
	onChange,
	onBlur,
	onFocus,
	initialWidth = 200,
	maxWidth,
	maxLength,
	fontSize,
	onMouseEnter,
	onMouseLeave,
	...props
}: InputNoBorderProps) {
	const [width, setWidth] = React.useState(initialWidth);
	const [isFocused, setIsFocused] = React.useState(false);
	const [isHovered, setIsHovered] = React.useState(false);
	const measureRef = React.useRef<HTMLSpanElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const containerRef = React.useRef<HTMLDivElement>(null);

	const currentValue = value ?? defaultValue ?? "";
	const currentLength = String(currentValue).length;
	const showIcon = isFocused || isHovered;
	const showCounter = maxLength !== undefined && isFocused;

	const fontSizeStyle = fontSize
		? { fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize }
		: undefined;

	const updateWidth = React.useCallback(() => {
		if (measureRef.current && containerRef.current && inputRef.current) {
			// Копируем стили из реального input в span для точного измерения
			const inputStyles = window.getComputedStyle(inputRef.current);
			const measureElement = measureRef.current;

			measureElement.style.fontSize = inputStyles.fontSize;
			measureElement.style.fontFamily = inputStyles.fontFamily;
			measureElement.style.fontWeight = inputStyles.fontWeight;
			measureElement.style.fontStyle = inputStyles.fontStyle;
			measureElement.style.letterSpacing = inputStyles.letterSpacing;
			measureElement.style.textTransform = inputStyles.textTransform;

			const measuredWidth = measureElement.offsetWidth + 24; // 24px для padding (px-3 = 12px с каждой стороны)

			// Получаем позицию контейнера относительно viewport
			const containerRect = containerRef.current.getBoundingClientRect();
			const availableWidth = window.innerWidth - containerRect.left - 16; // 16px отступ от правого края

			let limitWidth = availableWidth;
			if (maxWidth) {
				limitWidth = Math.min(availableWidth, maxWidth);
			}

			const newWidth = Math.max(
				initialWidth,
				Math.min(measuredWidth, limitWidth),
			);
			setWidth(newWidth);
		}
	}, [initialWidth, maxWidth]);

	React.useEffect(() => {
		updateWidth();
	}, [currentValue, updateWidth]);

	React.useEffect(() => {
		setWidth(initialWidth);
		updateWidth();
	}, [initialWidth, updateWidth]);

	React.useEffect(() => {
		// Обновляем ширину при изменении className или fontSize (например, при изменении размера текста)
		// Используем requestAnimationFrame чтобы стили успели примениться
		requestAnimationFrame(() => {
			updateWidth();
		});
	}, [className, fontSize, updateWidth]);

	React.useEffect(() => {
		window.addEventListener("resize", updateWidth);
		return () => {
			window.removeEventListener("resize", updateWidth);
		};
	}, [updateWidth]);

	return (
		<div ref={containerRef} className="inline-block relative">
			<span
				ref={measureRef}
				className="invisible absolute whitespace-pre px-3"
				aria-hidden="true"
			>
				{currentValue || (props.placeholder ?? "")}
			</span>
			<motion.input
				ref={inputRef}
				type={type}
				data-slot="input"
				value={value}
				defaultValue={defaultValue}
				onChange={onChange}
				maxLength={maxLength}
				onFocus={(e) => {
					setIsFocused(true);
					onFocus?.(e);
				}}
				onBlur={(e) => {
					setIsFocused(false);
					onBlur?.(e);
				}}
				onMouseEnter={(e) => {
					setIsHovered(true);
					onMouseEnter?.(e);
				}}
				onMouseLeave={(e) => {
					setIsHovered(false);
					onMouseLeave?.(e);
				}}
				animate={{ width: `${width}px` }}
				transition={{
					type: "spring",
					stiffness: 300,
					damping: 30,
				}}
				style={fontSizeStyle}
				className={cn(
					"file:text-foreground placeholder:text-muted-foreground selection:bg-transparent selection:text-primary-foreground dark:bg-transparent border-none h-9 rounded-md bg-transparent px-3 py-1 text-base transition-colors outline-none file:inline-flex file:h-7 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
					"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
					className,
				)}
				{...props}
			/>
			<motion.div
				initial={false}
				animate={{
					opacity: showIcon ? 1 : 0,
					scale: showIcon ? 1 : 0.8,
				}}
				transition={{
					duration: 0.2,
					ease: "easeOut",
				}}
				className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
				style={{ left: `${width + 8}px` }}
			>
				<Pen className="h-4 w-4 text-muted-foreground" />
			</motion.div>
			{maxLength !== undefined && (
				<motion.div
					initial={false}
					animate={{
						opacity: showCounter ? 1 : 0,
					}}
					transition={{
						duration: 0.2,
						ease: "easeOut",
					}}
					className="absolute left-0 pointer-events-none"
					style={{ bottom: "100%", marginBottom: "4px" }}
				>
					<span
						className={cn(
							"text-xs text-muted-foreground",
							currentLength >= maxLength && "text-destructive",
						)}
					>
						{currentLength}/{maxLength}
					</span>
				</motion.div>
			)}
		</div>
	);
}

export { InputNoBorder };
