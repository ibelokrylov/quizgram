import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableRow, TableCell } from "@/components/ui/table";
import { Eye, Trash2, ExternalLink } from "lucide-react";
import { MdEmail, MdPhone, MdPerson, MdTextFields } from "react-icons/md";
import type { BidListItem } from "@/entities/Bid/bid.type";
import {
	formatDateTime,
	getStatusText,
	getStatusColor,
	formatLocation,
	getContactsList,
} from "./BidsTable.shared";
import { useDeleteBid } from "@/entities/Bid/useBids";
import { useState } from "react";

interface BidsTableRowProps {
	bid: BidListItem;
}

export function BidsTableRow({ bid }: BidsTableRowProps) {
	const navigate = useNavigate();
	const location = formatLocation(bid.ipLocation);
	const deleteBidMutation = useDeleteBid();
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		if (!confirm("Вы уверены, что хотите удалить эту заявку?")) {
			return;
		}

		setIsDeleting(true);
		try {
			await deleteBidMutation.mutateAsync(bid.key);
		} catch (error) {
			console.error("Ошибка при удалении заявки:", error);
			alert("Не удалось удалить заявку. Попробуйте еще раз.");
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<TableRow>
			{/* Статус */}
			<TableCell className="p-3 whitespace-normal">
				<div className="flex flex-col gap-1">
					<Badge
						className={`text-xs px-1.5 py-0.5 w-fit ${getStatusColor(bid.status)}`}
					>
						{getStatusText(bid.status)}
					</Badge>
					{bid.first === false ? (
						<Badge variant="outline" className="text-xs px-1.5 py-0.5 w-fit">
							Повторная
						</Badge>
					) : null}
				</div>
			</TableCell>
			{/* Дата */}
			<TableCell className="p-3 whitespace-normal">
				<div className="flex flex-col gap-1">
					{!bid.isRead ? (
						<Badge variant="default" className="text-xs px-1.5 py-0.5 w-fit">
							New
						</Badge>
					) : null}
					<span className="text-sm">{formatDateTime(bid.createdAt)}</span>
					{location ? (
						<span className="text-xs text-muted-foreground">{location}</span>
					) : null}
				</div>
			</TableCell>
			{/* Квиз */}
			<TableCell className="p-3">
				<Link
					to="/app/quiz/$uid"
					params={{ uid: bid.uid }}
					className="flex items-center gap-1.5 text-sm text-primary hover:underline"
				>
					<ExternalLink className="h-3.5 w-3.5" />
					{bid.quizName}
				</Link>
			</TableCell>
			{/* Контакты */}
			<TableCell className="p-3 whitespace-normal">
				{(() => {
					const contactsList = getContactsList(bid.contacts);
					if (contactsList.length === 0) {
						return <span className="text-sm text-muted-foreground">-</span>;
					}
					return (
						<div className="flex flex-col gap-1.5">
							{contactsList.map((contact, index) => {
								const getIcon = () => {
									switch (contact.type) {
										case "email":
											return <MdEmail className="h-4 w-4" />;
										case "phone":
											return <MdPhone className="h-4 w-4" />;
										case "name":
											return <MdPerson className="h-4 w-4" />;
										case "text":
										default:
											return <MdTextFields className="h-4 w-4" />;
									}
								};
								return (
									<div
										key={index}
										className="flex items-center gap-2 text-sm text-muted-foreground"
									>
										{getIcon()}
										<span>{contact.value}</span>
									</div>
								);
							})}
						</div>
					);
				})()}
			</TableCell>
			{/* Действия */}
			<TableCell className="p-3">
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							navigate({
								to: "/app/bid/report",
								search: (prev) => ({
									...prev,
									key: bid.key,
									limit: prev.limit ?? 10,
								}),
							});
						}}
						className="h-8 w-8 p-0"
						title="Просмотреть ответ"
					>
						<Eye className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleDelete}
						disabled={isDeleting}
						className="h-8 w-8 p-0 text-destructive hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}
