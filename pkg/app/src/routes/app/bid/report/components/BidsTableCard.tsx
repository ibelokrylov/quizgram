import { Link, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2 } from "lucide-react";
import type { BidListItem } from "@/entities/Bid/bid.type";
import { formatDateTime, getStatusText, getStatusColor, formatLocation, formatContacts } from "./BidsTable.shared";

interface BidsTableCardProps {
  bid: BidListItem;
}

export function BidsTableCard({ bid }: BidsTableCardProps) {
  const navigate = useNavigate();
  const location = formatLocation(bid.ipLocation);

  return (
    <Card className="p-3">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{bid.quizName}</h3>
              <span
                className={`px-2 py-0.5 rounded text-xs shrink-0 ${getStatusColor(bid.status)}`}
              >
                {getStatusText(bid.status)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div className="flex items-center gap-2">
                {!bid.isRead && (
                  <Badge variant="default" className="text-xs px-1.5 py-0.5">
                    New
                  </Badge>
                )}
                <span>{formatDateTime(bid.createdAt)}</span>
              </div>
              {location && (
                <p>{location}</p>
              )}
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
              navigate({ to: `/app/bid/${bid.key}` });
            }}
            className="h-7 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Открыть
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm('Вы уверены, что хотите удалить эту заявку?')) {
                // Реализовать удаление
              }
            }}
            className="h-7 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Удалить
          </Button>
        </div>
      </div>
    </Card>
  );
}
