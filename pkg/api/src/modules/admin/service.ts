import { User, UserTable } from 'pkg-types';
import { db } from '../../db';

export abstract class AdminService {
  static async getAllUsers(limit: number, offset: number): Promise<Omit<User, 'password'>[]> {
    return (
      await db
        .select()
        .from(UserTable)
        // .where(eq(UserTable.isAdmin, false))
        .limit(limit)
        .offset(offset * limit)
    ).map((user) => {
      const { password, ...rest } = user;
      return rest;
    });
  }
}
