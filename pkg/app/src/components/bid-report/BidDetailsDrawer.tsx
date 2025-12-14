import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Loader } from "@/components/loader";
import type { BidDetails } from "@/entities/Bid/bid.type";

interface BidDetailsDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	bidDetails: BidDetails | undefined;
	isLoading: boolean;
	isError: boolean;
}

export function BidDetailsDrawer({
	open,
	onOpenChange,
	bidDetails,
	isLoading,
	isError,
}: BidDetailsDrawerProps) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<div className="max-w-[1000px] mx-auto w-full">
					<DrawerHeader>
						<DrawerTitle>Детали заявки</DrawerTitle>
						<DrawerDescription>
							{bidDetails ? `Заявка: ${bidDetails.key}` : "Загрузка..."}
						</DrawerDescription>
					</DrawerHeader>
					<div className="p-4">
					{isLoading ? (
						<div className="flex items-center justify-center min-h-[200px]">
							<Loader />
						</div>
					) : isError ? (
						<div className="text-destructive">
							Ошибка при загрузке деталей заявки
						</div>
					) : bidDetails ? (
						<div className="space-y-4">
							{/* Заглушка - здесь будет детальная информация о заявке */}
							<div className="space-y-2">
								<h3 className="font-semibold">Квиз: {bidDetails.quizName}</h3>
								<p className="text-sm text-muted-foreground">
									Статус: {bidDetails.status}
								</p>
								<p className="text-sm text-muted-foreground">
									Завершена: {bidDetails.isFull ? "Да" : "Нет"}
								</p>
								<p className="text-sm text-muted-foreground">
									Создана:{" "}
									{new Date(bidDetails.createdAt).toLocaleString("ru-RU")}
								</p>
								<p className="text-sm text-muted-foreground">
									Обновлена:{" "}
									{new Date(bidDetails.updatedAt).toLocaleString("ru-RU")}
								</p>
							</div>
							<div className="pt-4 border-t">
								<p className="text-sm text-muted-foreground">
									Здесь будет детальная информация о заявке
								</p>
							</div>
						</div>
					) : null}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
