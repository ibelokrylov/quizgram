import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Loader } from "@/components/loader";
import type { BidDetails } from "@/entities/Bid/bid.type";
import { Badge } from "@/components/ui/badge";

interface BidInfoDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	bidDetails: BidDetails | undefined;
	isLoading: boolean;
	isError: boolean;
}

export function BidInfoDrawer({
	open,
	onOpenChange,
	bidDetails,
	isLoading,
	isError,
}: BidInfoDrawerProps) {
	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<div className="max-w-[1000px] mx-auto w-full">
					<DrawerHeader>
						<DrawerTitle>Дополнительная информация о заявке</DrawerTitle>
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
								Ошибка при загрузке информации о заявке
							</div>
						) : bidDetails ? (
							<div className="space-y-6">
								{/* Основная информация */}
								<div className="space-y-3">
									<h3 className="font-semibold text-lg">Основная информация</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<p className="text-sm text-muted-foreground">Квиз</p>
											<p className="font-medium">{bidDetails.quizName}</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">Статус</p>
											<Badge variant="outline">{bidDetails.status}</Badge>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Завершена полностью
											</p>
											<p className="font-medium">
												{bidDetails.isFull ? "Да" : "Нет"}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Первая заявка
											</p>
											<p className="font-medium">
												{bidDetails.first ? "Да" : "Нет"}
											</p>
										</div>
									</div>
								</div>

								{/* Временные метки */}
								<div className="space-y-3 pt-4 border-t">
									<h3 className="font-semibold text-lg">Временные метки</h3>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<p className="text-sm text-muted-foreground">Создана</p>
											<p className="font-medium">
												{new Date(bidDetails.createdAt).toLocaleString("ru-RU")}
											</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">Обновлена</p>
											<p className="font-medium">
												{new Date(bidDetails.updatedAt).toLocaleString("ru-RU")}
											</p>
										</div>
									</div>
								</div>

								{/* IP и местоположение */}
								{bidDetails.ipLocation && (
									<div className="space-y-3 pt-4 border-t">
										<h3 className="font-semibold text-lg">
											Местоположение пользователя
										</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{bidDetails.ipLocation.city && (
												<div>
													<p className="text-sm text-muted-foreground">Город</p>
													<p className="font-medium">
														{bidDetails.ipLocation.city}
													</p>
												</div>
											)}
											{bidDetails.ipLocation.country && (
												<div>
													<p className="text-sm text-muted-foreground">
														Страна
													</p>
													<p className="font-medium">
														{bidDetails.ipLocation.country}
													</p>
												</div>
											)}
											{bidDetails.ipLocation.region && (
												<div>
													<p className="text-sm text-muted-foreground">
														Регион
													</p>
													<p className="font-medium">
														{bidDetails.ipLocation.region}
													</p>
												</div>
											)}
											{bidDetails.ipLocation.timezone && (
												<div>
													<p className="text-sm text-muted-foreground">
														Часовой пояс
													</p>
													<p className="font-medium">
														{bidDetails.ipLocation.timezone}
													</p>
												</div>
											)}
										</div>
									</div>
								)}

								{/* Технические данные */}
								<div className="space-y-3 pt-4 border-t">
									<h3 className="font-semibold text-lg">Технические данные</h3>
									<div className="grid grid-cols-1 gap-4">
										<div>
											<p className="text-sm text-muted-foreground">
												Ключ заявки
											</p>
											<p className="font-mono text-sm">{bidDetails.key}</p>
										</div>
										<div>
											<p className="text-sm text-muted-foreground">
												Идентификатор квиза
											</p>
											<p className="font-mono text-sm">{bidDetails.uid}</p>
										</div>
									</div>
								</div>
							</div>
						) : null}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
