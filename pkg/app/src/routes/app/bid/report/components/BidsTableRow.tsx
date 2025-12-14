import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Trash2, ExternalLink } from "lucide-react";
import { MdEmail, MdPhone, MdPerson, MdTextFields } from "react-icons/md";
import type { BidListItem } from "@/entities/Bid/bid.type";
import { formatDateTime, getStatusText, getStatusColor, formatLocation, getContactsList } from "./BidsTable.shared";

interface BidsTableRowProps {
  bid: BidListItem;
}

export function BidsTableRow({ bid }: BidsTableRowProps) {
  const navigate = useNavigate();
  const location = formatLocation(bid.ipLocation);

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      {/* Статус */}
      <td className="p-3">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(bid.status)}`}
        >
          {getStatusText(bid.status)}
        </span>
      </td>
      {/* Дата */}
      <td className="p-3">
        <div className="flex flex-col gap-1">
          {!bid.isRead ? (
            <Badge variant="default" className="text-xs px-1.5 py-0.5 w-fit">
              New
            </Badge>
          ) : null}
          <span className="text-sm">{formatDateTime(bid.createdAt)}</span>
          {location ? (
            <span className="text-xs text-muted-foreground">
              {location}
            </span>
          ) : null}
        </div>
      </td>
      {/* Квиз */}
      <td className="p-3">
        <Link
          to="/app/quiz/$uid"
          params={{ uid: bid.uid }}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {bid.quizName}
        </Link>
      </td>
      {/* Контакты */}
      <td className="p-3">
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
                    case 'email':
                      return <MdEmail className="h-4 w-4" />;
                    case 'phone':
                      return <MdPhone className="h-4 w-4" />;
                    case 'name':
                      return <MdPerson className="h-4 w-4" />;
                    case 'text':
                    default:
                      return <MdTextFields className="h-4 w-4" />;
                  }
                };
                return (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getIcon()}
                    <span>{contact.value}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </td>
      {/* Действия */}
      <td className="p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigate({ to: `/app/bid/${bid.key}` });
            }}
            className="h-8 w-8 p-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO: Удалить заявку
              if (confirm('Вы уверены, что хотите удалить эту заявку?')) {
                // Реализовать удаление
              }
            }}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
