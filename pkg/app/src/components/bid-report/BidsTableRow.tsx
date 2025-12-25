import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { BidListItem } from '@/entities/Bid/bid.type';
import { useDeleteBid } from '@/entities/Bid/useBids';
import { AuthContext } from '@/entities/User/auth.context';
import { Link, useNavigate } from '@tanstack/react-router';
import { ExternalLink, Eye, Trash2 } from 'lucide-react';
import { useContext, useState } from 'react';
import { MdEmail, MdInfoOutline, MdPerson, MdPhone, MdTextFields } from 'react-icons/md';
import { formatDateTime, formatLocation, getContactsList, getStatusColor, getStatusText } from './BidsTable.shared';

interface BidsTableRowProps {
  bid: BidListItem;
}

export function BidsTableRow({ bid }: BidsTableRowProps) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const location = formatLocation(bid.ipLocation);
  const deleteBidMutation = useDeleteBid();
  const [isDeleting, setIsDeleting] = useState(false);

  // Проверяем, не является ли план FREE (planId === 1)
  const isNotFreePlan = user?.planId !== 1;

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить эту заявку?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteBidMutation.mutateAsync(bid.key);
    } catch (error) {
      console.error('Ошибка при удалении заявки:', error);
      alert('Не удалось удалить заявку. Попробуйте еще раз.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <TableRow>
      {/* Статус */}
      <TableCell className='p-3 whitespace-normal'>
        <div className='flex flex-col gap-1'>
          <Badge className={`text-xs px-1.5 py-0.5 w-fit ${getStatusColor(bid.status)}`}>{getStatusText(bid.status)}</Badge>
          {bid.first === false ? (
            <Badge
              variant='outline'
              className='text-xs px-1.5 py-0.5 w-fit'
            >
              Повторная
            </Badge>
          ) : null}
        </div>
      </TableCell>
      {/* Дата */}
      <TableCell className='p-3 whitespace-normal'>
        <div className='flex flex-col gap-1'>
          {!bid.isRead ? (
            <Badge
              variant='default'
              className='text-xs px-1.5 py-0.5 w-fit'
            >
              New
            </Badge>
          ) : null}
          <span className='text-sm'>{formatDateTime(bid.createdAt)}</span>
          {location ? <span className='text-xs text-muted-foreground'>{location}</span> : null}
        </div>
      </TableCell>
      {/* Квиз */}
      <TableCell className='p-3'>
        <Link
          to='/app/quiz/$uid'
          params={{ uid: bid.uid }}
          className='flex items-center gap-1.5 text-sm text-primary hover:underline'
        >
          <ExternalLink className='h-3.5 w-3.5' />
          {bid.quizName}
        </Link>
      </TableCell>
      {/* Контакты */}
      <TableCell className='p-3 whitespace-normal'>
        {(() => {
          const contactsList = getContactsList(bid.contacts);
          if (contactsList.length === 0) {
            return <span className='text-sm text-muted-foreground'>-</span>;
          }
          return (
            <div className='flex flex-col gap-1.5'>
              {contactsList.map((contact, index) => {
                const getIcon = () => {
                  switch (contact.type) {
                    case 'email':
                      return <MdEmail className='h-4 w-4' />;
                    case 'phone':
                      return <MdPhone className='h-4 w-4' />;
                    case 'name':
                      return <MdPerson className='h-4 w-4' />;
                    case 'text':
                    default:
                      return <MdTextFields className='h-4 w-4' />;
                  }
                };
                return (
                  <div
                    key={index}
                    className='flex items-center gap-2 text-sm text-muted-foreground'
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
      <TableCell className='p-3'>
        <div className='flex items-center justify-end gap-2'>
          {isNotFreePlan && bid.info && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    navigate({
                      to: '/app/bid/report',
                      search: (prev) => ({
                        ...prev,
                        infoKey: bid.key,
                        limit: prev.limit ?? 10,
                      }),
                    });
                  }}
                  className='h-8 w-8 p-0 text-blue-500 hover:text-white dark:hover:text-blue-600'
                >
                  <MdInfoOutline className='h-5 w-5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Дополнительная информация</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  navigate({
                    to: '/app/bid/report',
                    search: (prev) => ({
                      ...prev,
                      key: bid.key,
                      limit: prev.limit ?? 10,
                    }),
                  });
                }}
                className='h-8 w-8 p-0 hover:text-white dark:hover:text-accent-foreground'
              >
                <Eye className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Посмотреть ответ</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleDelete}
                disabled={isDeleting}
                className='h-8 w-8 p-0 text-destructive hover:text-white dark:hover:text-destructive'
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Удалить</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TableCell>
    </TableRow>
  );
}
