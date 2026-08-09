import { Router, type IRouter } from "express";
import { db, paymentsTable, plotsTable, activityLogsTable, eq, sql, desc } from "@workspace/db";

const router: IRouter = Router();

function requireCrm(req: any, res: any): boolean {
  if (!req.session?.userId || req.session.userType !== "crm") {
    res.status(403).json({ error: "CRM access required" });
    return false;
  }
  return true;
}

function requireAuth(req: any, res: any): boolean {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
}

function serializePayment(p: typeof paymentsTable.$inferSelect) {
  return {
    id: p.id,
    plotId: p.plotId,
    amount: Number(p.amount),
    paymentMode: p.paymentMode,
    referenceNumber: p.referenceNumber,
    paymentDate: p.paymentDate.toISOString(),
    notes: p.notes,
    recordedBy: p.recordedBy,
    createdAt: p.createdAt.toISOString(),
  };
}

// List every payment recorded against a plot, most recent first.
router.get("/plots/:plotId/payments", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const plotId = Number(req.params.plotId);
  if (!Number.isFinite(plotId)) {
    res.status(400).json({ error: "Invalid plot id" });
    return;
  }

  const rows = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.plotId, plotId))
    .orderBy(desc(paymentsTable.paymentDate), desc(paymentsTable.id));

  const [{ total }] = await db
    .select({ total: sql<string>`coalesce(sum(${paymentsTable.amount}), 0)` })
    .from(paymentsTable)
    .where(eq(paymentsTable.plotId, plotId));

  res.json({
    payments: rows.map(serializePayment),
    totalReceived: Number(total),
  });
});

// Record a new payment against a plot. CRM only.
router.post("/plots/:plotId/payments", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;

  const plotId = Number(req.params.plotId);
  if (!Number.isFinite(plotId)) {
    res.status(400).json({ error: "Invalid plot id" });
    return;
  }

  const [plot] = await db.select().from(plotsTable).where(eq(plotsTable.id, plotId));
  if (!plot) {
    res.status(404).json({ error: "Plot not found" });
    return;
  }

  const amount = Number(req.body?.amount);
  const paymentMode = typeof req.body?.paymentMode === "string" ? req.body.paymentMode.trim() : "";
  const referenceNumber = typeof req.body?.referenceNumber === "string" ? req.body.referenceNumber.trim() : "";
  const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";
  const rawDate = req.body?.paymentDate;

  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "A valid payment amount is required." });
    return;
  }
  if (!paymentMode) {
    res.status(400).json({ error: "Payment mode is required." });
    return;
  }
  const paymentDate = rawDate ? new Date(rawDate) : new Date();
  if (Number.isNaN(paymentDate.getTime())) {
    res.status(400).json({ error: "Invalid payment date." });
    return;
  }

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      plotId,
      amount: String(amount),
      paymentMode,
      referenceNumber: referenceNumber || null,
      paymentDate,
      notes: notes || null,
      recordedBy: req.session.userName ?? "CRM",
    })
    .returning();

  await db.insert(activityLogsTable).values({
    userName: req.session.userName ?? "CRM",
    action: "Payment Recorded",
    plotNumber: plot.plotNumber,
    oldData: null,
    newData: JSON.stringify({
      amount: Number(payment.amount),
      paymentMode: payment.paymentMode,
      referenceNumber: payment.referenceNumber,
    }),
  });

  res.status(201).json(serializePayment(payment));
});

// Remove a payment entry (e.g. entered by mistake). CRM only.
router.delete("/payments/:id", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid payment id" });
    return;
  }

  const [payment] = await db.delete(paymentsTable).where(eq(paymentsTable.id, id)).returning();
  if (!payment) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }

  const [plot] = await db.select().from(plotsTable).where(eq(plotsTable.id, payment.plotId));

  await db.insert(activityLogsTable).values({
    userName: req.session.userName ?? "CRM",
    action: "Payment Deleted",
    plotNumber: plot?.plotNumber ?? `Plot #${payment.plotId}`,
    oldData: JSON.stringify({ amount: Number(payment.amount), paymentMode: payment.paymentMode }),
    newData: null,
  });

  res.sendStatus(204);
});

export default router;
