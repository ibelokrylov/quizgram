import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePlans } from '@/entities/User/usePlans';
import http from '@/lib/http';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { t } from 'i18next';
import { User } from 'pkg-types';
import z from 'zod';

const validateSearch = z.object({
  offset: z.number().optional(),
});

export const Route = createFileRoute('/app/admin/user')({
  component: RouteComponent,
  validateSearch: validateSearch,
  loaderDeps: ({ search: { offset } }) => ({ offset: offset || 1 }),
  loader: async (ctx) => {
    const response = await http<Omit<User, 'password'>[]>({
      url: `/v1/admin/users?limit=10&offset=${ctx.deps.offset || 1}`,
    });
    return { users: response.data, offset: ctx.deps.offset || 1 };
  },
});

function RouteComponent() {
  const { users, offset } = Route.useLoaderData();
  const navigate = useNavigate();
  const plans = usePlans();

  async function handlePageChange(newOffset: number | 'next' | 'prev') {
    if (newOffset === 'next') {
      navigate({ to: '/app/admin/user', search: { offset: offset + 1 } });
    }
    if (newOffset === 'prev') {
      navigate({ to: '/app/admin/user', search: { offset: Math.max(1, offset - 1) } });
    }
    if (typeof newOffset === 'number') {
      navigate({ to: '/app/admin/user', search: { offset: newOffset } });
    }
  }

  return (
    <div className={'flex flex-col gap-4'}>
      <Table>
        <TableCaption>Список пользователей</TableCaption>
        <TableHeader>
          <TableHead>id</TableHead>
          <TableHead>{t('table.head.login')}</TableHead>
          <TableHead>{t('table.head.name')}</TableHead>
          <TableHead>{t('table.head.planId')}</TableHead>
          <TableHead>{t('table.head.quizCount')}</TableHead>
          <TableHead>{t('table.head.isVerification')}</TableHead>
          <TableHead>{t('table.head.language')}</TableHead>
          <TableHead>{t('table.head.createdAt')}</TableHead>
          <TableHead>{t('table.head.updatedAt')}</TableHead>
          <TableHead>{t('table.head.telegramId')}</TableHead>
        </TableHeader>
        <TableBody>
          {users?.map((user) => (
            <TableRow key={user.uid}>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.login}</TableCell>
              <TableCell>{user.name}</TableCell>
              <TableCell>
                {plans.query.data?.find((plan) => plan.id === user.planId)?.name}
              </TableCell>
              <TableCell>{user.quizCount}</TableCell>
              <TableCell>{user.isVerification ? 'true' : 'false'}</TableCell>
              <TableCell>{user.language}</TableCell>
              <TableCell>{format(user.createdAt, 'dd.MM.yyyy HH:mm:ss')}</TableCell>
              <TableCell>{format(user.updatedAt, 'dd.MM.yyyy HH:mm:ss')}</TableCell>
              <TableCell>{user.telegramId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => handlePageChange('prev')} />
          </PaginationItem>
          {offset !== 1 ? (
            <PaginationItem>
              <PaginationLink onClick={() => handlePageChange(offset - 1)}>
                {offset - 1}
              </PaginationLink>
            </PaginationItem>
          ) : null}
          <PaginationItem>
            <PaginationLink isActive>{offset}</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink onClick={() => handlePageChange(offset + 1)}>
              {offset + 1}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext onClick={() => handlePageChange('next')} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
