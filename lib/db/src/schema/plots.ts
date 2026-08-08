import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const plotsTable = pgTable("plots", {
  id: serial("id").primaryKey(),
  plotNumber: text("plot_number").notNull().unique(),
  projectId: integer("project_id").references(() => projectsTable.id),
  widthMtr: numeric("width_mtr", { precision: 10, scale: 2 }).notNull(),
  lengthMtr: numeric("length_mtr", { precision: 10, scale: 2 }).notNull(),
  areaSqMtr: numeric("area_sq_mtr", { precision: 10, scale: 2 }).notNull(),
  areaSqYrd: numeric("area_sq_yrd", { precision: 10, scale: 2 }).notNull(),
  plotFacing: text("plot_facing").notNull(),
  plcType: text("plc_type").notNull(),
  status: text("status").notNull().default("Available"),

  // --- CRM fields (all optional — filled in as a plot moves through sale) ---
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  clientEmail: text("client_email"),
  loginRate: numeric("login_rate", { precision: 12, scale: 2 }),
  companyRate: numeric("company_rate", { precision: 12, scale: 2 }),
  paymentDetails: text("payment_details"),
  allotmentDate: timestamp("allotment_date", { withTimezone: true }),
  bbaDate: timestamp("bba_date", { withTimezone: true }),
  allotmentLetterDeliveredDate: timestamp("allotment_letter_delivered_date", { withTimezone: true }),
  bbaDeliveredDate: timestamp("bba_delivered_date", { withTimezone: true }),
  remarks: text("remarks"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlotSchema = createInsertSchema(plotsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlot = z.infer<typeof insertPlotSchema>;
export type Plot = typeof plotsTable.$inferSelect;
