import { asc, eq } from 'drizzle-orm';
import { User, UserTable } from 'pkg-types';
import { db } from '../../db';

export abstract class AdminService {
  static async getAllUsers(
    limit: number,
    offset: number
  ): Promise<{ user: Omit<User, 'password'>[]; count: number }> {
    const u = (
      await db
        .select()
        .from(UserTable)
        .where(eq(UserTable.isAdmin, false))
        .limit(limit)
        .offset(offset * limit)
        .orderBy(asc(UserTable.createdAt))
    ).map((user) => {
      const { password, ...rest } = user;
      return rest;
    });
    const count = await db.select().from(UserTable).where(eq(UserTable.isAdmin, false));

    return { user: u, count: count?.length ?? 0 };
  }
}
