import { double, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const salesHubs = mysqlTable("sales_hubs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull().unique(),
  city: varchar("city", { length: 80 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  ddd: varchar("ddd", { length: 2 }),
  latitude: double("latitude").notNull(),
  longitude: double("longitude").notNull(),
  minimumScore: int("minimumScore"),
  isDefault: int("isDefault").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const scoringParameters = mysqlTable("scoring_parameters", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  label: varchar("label", { length: 120 }).notNull(),
  value: int("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SalesHub = typeof salesHubs.$inferSelect;
export type InsertSalesHub = typeof salesHubs.$inferInsert;
export type ScoringParameter = typeof scoringParameters.$inferSelect;
export type InsertScoringParameter = typeof scoringParameters.$inferInsert;
