import { pgTable, serial, text, timestamp, integer, real, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const jobStatusEnum = pgEnum("job_status", ["open", "accepted", "in_progress", "completed", "cancelled"]);
export const transportZoneEnum = pgEnum("transport_zone", ["inside_gaborone", "outside_gaborone"]);
export const photoTypeEnum = pgEnum("photo_type", ["before", "after"]);
export const uploadedByEnum = pgEnum("uploaded_by", ["customer", "worker"]);
export const quoteStatusEnum = pgEnum("quote_status", ["pending", "accepted", "rejected"]);

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => usersTable.id),
  workerId: integer("worker_id").references(() => usersTable.id),
  serviceType: text("service_type").notNull(),
  serviceTier: text("service_tier"),
  description: text("description").notNull(),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  locationLat: real("location_lat").notNull(),
  locationLng: real("location_lng").notNull(),
  locationAddress: text("location_address"),
  transportZone: transportZoneEnum("transport_zone").notNull(),
  transportFee: real("transport_fee").notNull(),
  basePrice: real("base_price"),
  platformFee: real("platform_fee"),
  totalPrice: real("total_price"),
  status: jobStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const jobPhotosTable = pgTable("job_photos", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id),
  photoType: photoTypeEnum("photo_type").notNull(),
  photoUrl: text("photo_url").notNull(),
  uploadedBy: uploadedByEnum("uploaded_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quotesTable = pgTable("quotes", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobsTable.id),
  workerId: integer("worker_id").notNull().references(() => usersTable.id),
  amount: real("amount").notNull(),
  message: text("message"),
  status: quoteStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactMessagesTable = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPhotoSchema = createInsertSchema(jobPhotosTable).omit({ id: true, createdAt: true });
export const insertQuoteSchema = createInsertSchema(quotesTable).omit({ id: true, createdAt: true });

export type Job = typeof jobsTable.$inferSelect;
export type JobPhoto = typeof jobPhotosTable.$inferSelect;
export type Quote = typeof quotesTable.$inferSelect;
export type ContactMessage = typeof contactMessagesTable.$inferSelect;
export type InsertJob = z.infer<typeof insertJ
