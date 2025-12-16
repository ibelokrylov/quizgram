import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import { useTranslation } from "react-i18next";
import * as React from "react";

interface TextAreaNoBorderProps
	extends Omit<HTMLMotionProps<"textarea">, "type"> {
	initialWidth?: number;
	initialHeight?: number;
	minHeight?: number;
	maxHeight?: number;
	maxWidth?: number | string;
	maxLength?: number;
	fontSize?: string | number;
	fixedWidth?: number;
}

function TextAreaNoBorder({
	className,
	value,
	defaultValue,
	onChange,
	onInput,
	initialWidth = 200,
	initialHeight = 40,
	minHeight = 40,
	maxHeight,
	maxWidth,
	maxLength,
	fontSize,
	fixedWidth,
	...restProps
}: TextAreaNoBorderProps) {
	const { t } = useTranslation();
	const [width, setWidth] = React.useState(fixedWidth ?? initialWidth);
	const [height, setHeight] = React.useState(initialHeight);
	const [isFocused, setIsFocused] = React.useState(false);
	const measureRef = React.useRef<HTMLDivElement>(null);
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const isTypingRef = React.useRef(false);

	const currentValue = value ?? defaultValue ?? "";
	const currentLength = String(currentValue).length;
	const showCounter = maxLength !== undefined && isFocused;

	const fontSizeStyle = fontSize
		? { fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize }
		: undefined;

	// Вычисляет числовое значение maxWidth из числа или CSS-выражения
	const getMaxWidthValue = React.useCallback(
		(
			maxWidthValue: number | string | undefined,
			containerWidth: number,
		): number | undefined => {
			if (maxWidthValue === undefined) return undefined;
			if (typeof maxWidthValue === "number") return maxWidthValue;

			// Для строковых значений (CSS calc) используем временный элемент для вычисления
			// Создаем родительский контейнер с нужной шириной для корректного вычисления 100%
			const parentElement = document.createElement("div");
			parentElement.style.position = "absolute";
			parentElement.style.visibility = "hidden";
			parentElement.style.width = `${containerWidth}px`;
			parentElement.style.left = "0";

			const tempElement = document.createElement("div");
			tempElement.style.width = maxWidthValue;
			parentElement.appendChild(tempElement);
			document.body.appendChild(parentElement);

			const computedWidth = tempElement.offsetWidth;
			document.body.removeChild(parentElement);

			return computedWidth;
		},
		[],
	);

	// Состояние для числового значения maxWidth (для использования в className)
	const [maxWidthNumeric, setMaxWidthNumeric] = React.useState<
		number | undefined
	>(typeof maxWidth === "number" ? maxWidth : undefined);

	// Копирует стили из textarea в элемент измерения
	const copyTextareaStyles = React.useCallback(
		(measureElement: HTMLDivElement) => {
			if (!textareaRef.current) return;
			const textareaStyles = window.getComputedStyle(textareaRef.current);
			measureElement.style.fontSize = textareaStyles.fontSize;
			measureElement.style.fontFamily = textareaStyles.fontFamily;
			measureElement.style.fontWeight = textareaStyles.fontWeight;
			measureElement.style.fontStyle = textareaStyles.fontStyle;
			measureElement.style.letterSpacing = textareaStyles.letterSpacing;
			measureElement.style.textTransform = textareaStyles.textTransform;
			measureElement.style.lineHeight = textareaStyles.lineHeight;
			measureElement.style.whiteSpace = "pre-wrap";
		},
		[textareaRef],
	);

	// Вычисляет минимальную высоту одной строки
	const calculateMinHeight = React.useCallback(
		(measureElement: HTMLDivElement): number => {
			measureElement.textContent = "M";
			measureElement.style.width = "auto";
			const singleLineHeight = measureElement.scrollHeight;
			return Math.max(minHeight, singleLineHeight);
		},
		[minHeight],
	);

	type MeasurementValue = string | number | readonly string[] | undefined;

	const normalizeMeasurementValue = React.useCallback(
		(value?: MeasurementValue): string => {
			if (Array.isArray(value)) {
				return value.join("\n");
			}
			return value !== undefined ? String(value) : "";
		},
		[],
	);

	// Вычисляет ширину на основе содержимого
	const calculateWidth = React.useCallback(
		(
			measureElement: HTMLDivElement,
			valueToMeasure?: MeasurementValue,
		): number => {
			if (fixedWidth !== undefined) {
				return fixedWidth;
			}

			if (!containerRef.current) return initialWidth;

			const containerRect = containerRef.current.getBoundingClientRect();
			const availableWidth = window.innerWidth - containerRect.left - 16;

			// Вычисляем числовое значение maxWidth (может быть число или CSS-выражение)
			const maxWidthValue = getMaxWidthValue(maxWidth, availableWidth);
			const limitWidth = maxWidthValue
				? Math.min(availableWidth, maxWidthValue)
				: availableWidth;

			const measurementValue = normalizeMeasurementValue(
				valueToMeasure ?? currentValue ?? restProps.placeholder,
			);
			const textLines = measurementValue.split("\n");
			const longestLine = textLines.reduce(
				(a: string, b: string) => (a.length > b.length ? a : b),
				"",
			);
			measureElement.style.width = "auto";
			measureElement.textContent = longestLine || (restProps.placeholder ?? "");
			const measuredWidth = measureElement.offsetWidth + 24;

			return Math.max(initialWidth, Math.min(measuredWidth, limitWidth));
		},
		[
			fixedWidth,
			maxWidth,
			initialWidth,
			currentValue,
			restProps.placeholder,
			containerRef,
		],
	);

	// Вычисляет высоту на основе содержимого и ширины
	const calculateHeight = React.useCallback(
		(
			measureElement: HTMLDivElement,
			currentWidth: number,
			effectiveMinHeight: number,
			valueToMeasure?: MeasurementValue,
		): number => {
			measureElement.style.width = `${currentWidth - 24}px`;

			// Вычисляем числовое значение maxWidth для сравнения
			const containerRect = containerRef.current?.getBoundingClientRect();
			const availableWidth = containerRect
				? window.innerWidth - containerRect.left - 16
				: window.innerWidth;
			const maxWidthValue = getMaxWidthValue(maxWidth, availableWidth);

			if (maxWidthValue && currentWidth >= maxWidthValue) {
				measureElement.style.wordBreak = "break-all";
				measureElement.style.wordWrap = "break-word";
			} else {
				measureElement.style.wordBreak = "normal";
				measureElement.style.wordWrap = "break-word";
			}

			const measurementValue = normalizeMeasurementValue(
				valueToMeasure ?? currentValue ?? restProps.placeholder,
			);
			measureElement.textContent = measurementValue;
			const measuredHeight = measureElement.scrollHeight;

			let newHeight = Math.max(effectiveMinHeight, measuredHeight);
			if (maxHeight) {
				newHeight = Math.min(newHeight, maxHeight);
			}
			return newHeight;
		},
		[maxWidth, maxHeight, currentValue, restProps.placeholder],
	);

	// Основная функция обновления размеров
	const updateDimensions = React.useCallback(
		(valueOverride?: MeasurementValue) => {
			if (!measureRef.current || !textareaRef.current) return;

			const measureElement = measureRef.current;
			copyTextareaStyles(measureElement);

			// Обновляем числовое значение maxWidth для className
			if (maxWidth) {
				if (typeof maxWidth === "number") {
					setMaxWidthNumeric(maxWidth);
				} else if (containerRef.current) {
					const containerRect = containerRef.current.getBoundingClientRect();
					const availableWidth = window.innerWidth - containerRect.left - 16;
					const computedMaxWidth = getMaxWidthValue(maxWidth, availableWidth);
					setMaxWidthNumeric(computedMaxWidth);
				}
			} else {
				setMaxWidthNumeric(undefined);
			}

			const valueForMeasurement =
				valueOverride ?? currentValue ?? restProps.placeholder ?? "";
			const effectiveMinHeight = calculateMinHeight(measureElement);
			const newWidth = calculateWidth(measureElement, valueForMeasurement);
			const newHeight = calculateHeight(
				measureElement,
				newWidth,
				effectiveMinHeight,
				valueForMeasurement,
			);

			setWidth(newWidth);
			setHeight(newHeight);
		},
		[
			maxWidth,
			currentValue,
			restProps.placeholder,
			measureRef,
			textareaRef,
			containerRef,
		],
	);

	// Обновление начальных размеров и фиксированной ширины
	React.useLayoutEffect(() => {
		const newWidth = fixedWidth ?? initialWidth;
		setWidth(newWidth);
		setHeight(initialHeight);
		updateDimensions();
	}, []);

	const handleInput = React.useCallback(
		(event: React.FormEvent<HTMLTextAreaElement>) => {
			const nextValue = event.currentTarget.value;
			isTypingRef.current = true;
			updateDimensions(nextValue);
			requestAnimationFrame(() => {
				isTypingRef.current = false;
			});
			onInput?.(event);
		},
		[isTypingRef],
	);

	return (
		<div ref={containerRef} className="inline-block relative">
			<div
				ref={measureRef}
				className="invisible absolute whitespace-pre-wrap px-3 py-2 wrap-break-word"
				aria-hidden="true"
			>
				{currentValue || (restProps.placeholder ?? "")}
			</div>
			<motion.textarea
				ref={textareaRef}
				data-slot="textarea"
				value={value}
				defaultValue={defaultValue}
				onChange={onChange}
				onInput={handleInput}
				maxLength={maxLength}
				onFocus={(e) => {
					setIsFocused(true);
					restProps.onFocus?.(e);
				}}
				onBlur={(e) => {
					setIsFocused(false);
					restProps.onBlur?.(e);
				}}
				onMouseEnter={restProps.onMouseEnter}
				onMouseLeave={restProps.onMouseLeave}
				animate={{
					width: `${width}px`,
					height: `${height}px`,
				}}
				transition={{
					type: "spring",
					stiffness: 300,
					damping: 30,
				}}
				style={fontSizeStyle}
				className={cn(
					"placeholder:text-muted-foreground selection:bg-accent selection:text-accent-foreground dark:bg-transparent border-none rounded-md bg-transparent px-3 py-2 text-base transition-colors outline-none resize-none overflow-hidden disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
					"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
					"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
					maxWidthNumeric && width >= maxWidthNumeric && "break-all",
					className,
				)}
				{...restProps}
			/>
			<div className="absolute right-0 pointer-events-none" style={{ bottom: "-5px" }}>
				<span className="text-xs text-muted-foreground">{t("input.edit")}</span>
			</div>
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

export { TextAreaNoBorder };
