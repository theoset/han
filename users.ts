import { pgTable, serial, text, timestamp, boolean, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["customer", "worker", "admin"]);
export const kycStatusEnum = pgEnum("kyc_status", ["pending", "verified", "rejected"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone").notNull(),
  role: userRoleEnum("role").notNull().default("customer"),
  areaLocation: text("area_location"),
  kycStatus: kycStatusEnum("kyc_status"),
  idDocumentUrl: text("id_document_url"),
  selfieUrl: text("selfie_url"),
  proofOfAddressUrl: text("proof_of_address_url"),
  kycConsent: boolean("kyc_consent").default(false),
  rating: text("rating"),
  jobsCompleted: integer("jobs_completed").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workerServicesTable = pgTable("worker_services", {
  id: serial("id").primaryKey(),
  workerId: integer("worker_id").notNull().references(() => usersTable.id),
  serviceType: text("service_type").notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type WorkerService = typeof workerServicesTable.$inferSelect;
