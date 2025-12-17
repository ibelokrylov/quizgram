import { Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2 } from "lucide-react";
import { MdInfoOutline } from "react-icons/md";
import type { BidListItem } from "@/entities/Bid/bid.type";
import {
	formatDateTime,
	getStatusText,
	getStatusColor,
	formatLocation,
	formatContacts,
} from "./BidsTable.shared";
import { useDeleteBid } from "@/entities/Bid/useBids";
import { useState, useContext } from "react";
import { AuthContext } from "@/entities/User/auth.context";

interface BidsTableCardProps {
	bid: BidListItem;
}

export function BidsTableCard({ bid }: BidsTableCardProps) {
	const navigate = useNavigate();
	const { user } = useContext(AuthContext);
	const location = formatLocation(bid.ipLocation);
	const deleteBidMutation = useDeleteBid();
	const [isDeleting, setIsDeleting] = useState(false);

	// Проверяем, не является ли план FREE (planId === 1)
	const isNotFreePlan = user?.planId !== 1;

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
		<Card className="p-3">
			<div className="flex flex-col gap-3">
				<div className="flex items-start justify-between gap-2">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<h3 className="font-semibold text-sm truncate">{bid.quizName}</h3>
							<Badge
								className={`text-xs px-1.5 py-0.5 shrink-0 ${getStatusColor(bid.status)}`}
							>
								{getStatusText(bid.status)}
							</Badge>
						</div>
						<div className="text-xs text-muted-foreground space-y-0.5">
							<div className="flex items-center gap-2">
								{!bid.isRead ? (
									<Badge
										variant="default"
										className="text-xs px-1.5 py-0.5 w-fit"
									>
										New
									</Badge>
								) : null}
								<span>{formatDateTime(bid.createdAt)}</span>
							</div>
							{location && <p>{location}</p>}
							<p>Контакты: {formatContacts(bid.contacts)}</p>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2 pt-2 border-t">
					<Link
						to="/app/quiz/$uid"
						params={{ uid: bid.uid }}
						className="text-xs text-primary hover:underline"
					>
						Открыть квиз
					</Link>
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
						className="h-7 text-xs"
					>
						<Eye className="h-3 w-3 mr-1" />
						Просмотреть ответ
					</Button>
					{isNotFreePlan && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => {
								navigate({
									to: "/app/bid/report",
									search: (prev) => ({
										...prev,
										infoKey: bid.key,
										limit: prev.limit ?? 10,
									}),
								});
							}}
							className="h-7 px-2 text-xs text-blue-500 hover:text-blue-600"
							title="Дополнительная информация"
						>
							<MdInfoOutline className="h-4 w-4" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						onClick={handleDelete}
						disabled={isDeleting}
						className="h-7 text-xs text-destructive hover:text-destructive"
					>
						<Trash2 className="h-3 w-3 mr-1" />
						{isDeleting ? "Удаление..." : "Удалить"}
					</Button>
				</div>
			</div>
		</Card>
	);
}
