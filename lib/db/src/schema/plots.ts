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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlotSchema = createInsertSchema(plotsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlot = z.infer<typeof insertPlotSchema>;
export type Plot = typeof plotsTable.$inferSelect;
