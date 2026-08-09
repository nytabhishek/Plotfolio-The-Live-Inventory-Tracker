import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { plotsTable } from "./plots";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  plotId: integer("plot_id")
    .notNull()
    .references(() => plotsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  // Cash | Cheque | RTGS | NEFT | UPI | Card | Other
  paymentMode: text("payment_mode").notNull(),
  // RTGS/NEFT UTR number, cheque number, UPI transaction id, etc. — optional (e.g. Cash)
  referenceNumber: text("reference_number"),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull(),
  notes: text("notes"),
  recordedBy: text("recorded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
