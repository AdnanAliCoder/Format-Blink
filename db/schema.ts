import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const settings=sqliteTable('settings',{id:text('id').primaryKey(),value:text('value').notNull()});
export const users=sqliteTable('users',{id:text('id').primaryKey(),email:text('email').notNull().unique(),name:text('name').notNull(),password:text('password').notNull(),role:text('role').notNull().default('member'),status:text('status').notNull().default('active'),createdAt:text('created_at').notNull(),lastLogin:text('last_login')});
export const sessions=sqliteTable('sessions',{token:text('token').primaryKey(),userId:text('user_id').notNull(),expires:integer('expires').notNull()},t=>[index('idx_sessions_user').on(t.userId)]);
export const activity=sqliteTable('activity',{id:text('id').primaryKey(),userId:text('user_id'),name:text('name').notNull(),detail:text('detail').notNull(),createdAt:text('created_at').notNull()},t=>[index('idx_activity_date').on(t.createdAt)]);
