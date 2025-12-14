import { cva, type VariantProps } from "class-variance-authority";
import {
	CheckCircle2,
	Info,
	OctagonAlert,
	type LucideIcon,
} from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const messageVariants = cva(
	"flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium leading-5 backdrop-blur-sm border border-transparent shadow-[0_8px_20px_-15px_rgba(0,0,0,0.45)]",
	{
		variants: {
			variant: {
				success:
					"bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-100",
				error: "bg-red-500/15 text-red-700 dark:bg-red-400/20 dark:text-red-50",
				info: "bg-orange-500/15 text-orange-700 dark:bg-orange-400/20 dark:text-orange-50",
			},
		},
		defaultVariants: {
			variant: "info",
		},
	},
);

const iconMap: Record<
	NonNullable<VariantProps<typeof messageVariants>["variant"]>,
	LucideIcon
> = {
	success: CheckCircle2,
	error: OctagonAlert,
	info: Info,
};

type MessageProps = React.ComponentProps<"div"> &
	VariantProps<typeof messageVariants> & {
		title?: React.ReactNode;
		description?: React.ReactNode;
	};

function Message({
	className,
	variant,
	title,
	description,
	children,
	...props
}: MessageProps) {
	const Icon = iconMap[variant ?? "info"];

	return (
		<div
			data-slot="message"
			role="status"
			className={cn(messageVariants({ variant, className }))}
			{...props}
		>
			<span className="mt-0.5 rounded-full border border-current/20 bg-current/10 p-1">
				<Icon className="size-4 text-current" aria-hidden="true" />
			</span>
			<div className="space-y-1 text-current">
				{title ? (
					<p className="text-sm font-semibold leading-5 text-current">
						{title}
					</p>
				) : null}
				{description ? (
					<p className="text-sm/5 text-current/85">{description}</p>
				) : null}
				{!title && !description ? (
					<p className="text-sm/5 text-current">{children}</p>
				) : (
					children
				)}
			</div>
		</div>
	);
}

export { Message };
