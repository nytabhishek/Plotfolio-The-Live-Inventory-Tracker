import { Router, type IRouter } from "express";
import { db, plotsTable, projectsTable, activityLogsTable, eq, sql, and } from "@workspace/db";
import {
  CreatePlotBody,
  UpdatePlotBody,
  UpdatePlotParams,
  DeletePlotParams,
  GetPlotParams,
  GetPlotsQueryParams,
} from "@workspace/api-zod";
import { broadcastPlotChange } from "../lib/sse";
import ExcelJS from "exceljs";

const router: IRouter = Router();

// Shape the DB row consistently for every response (list, single, create, update).
function serializePlot(plot: typeof plotsTable.$inferSelect) {
  return {
    id: plot.id,
    plotNumber: plot.plotNumber,
    projectId: plot.projectId,
    widthMtr: Number(plot.widthMtr),
    lengthMtr: Number(plot.lengthMtr),
    areaSqMtr: Number(plot.areaSqMtr),
    areaSqYrd: Number(plot.areaSqYrd),
    plotFacing: plot.plotFacing,
    plcType: plot.plcType,
    status: plot.status,
    clientName: plot.clientName,
    clientPhone: plot.clientPhone,
    clientEmail: plot.clientEmail,
    loginRate: plot.loginRate !== null ? Number(plot.loginRate) : null,
    companyRate: plot.companyRate !== null ? Number(plot.companyRate) : null,
    paymentDetails: plot.paymentDetails,
    allotmentDate: plot.allotmentDate ? plot.allotmentDate.toISOString() : null,
    bbaDate: plot.bbaDate ? plot.bbaDate.toISOString() : null,
    allotmentLetterDeliveredDate: plot.allotmentLetterDeliveredDate
      ? plot.allotmentLetterDeliveredDate.toISOString()
      : null,
    bbaDeliveredDate: plot.bbaDeliveredDate ? plot.bbaDeliveredDate.toISOString() : null,
    remarks: plot.remarks,
    createdAt: plot.createdAt.toISOString(),
    updatedAt: plot.updatedAt.toISOString(),
  };
}

// Parse an optional date field coming from the client:
//  - undefined  -> field not being touched, leave out of the update
//  - ""  / null -> explicitly clear the date
//  - "2026-01-01" -> set the date
function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Helper: require CRM session
function requireCrm(req: any, res: any): boolean {
  if (!req.session?.userId || req.session.userType !== "crm") {
    res.status(403).json({ error: "CRM access required" });
    return false;
  }
  return true;
}

// Helper: require any authenticated session
function requireAuth(req: any, res: any): boolean {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
}

router.get("/plots", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const queryParsed = GetPlotsQueryParams.safeParse(req.query);
  const params = queryParsed.success ? queryParsed.data : {};

  const isSales = req.session.userType === "sales";

  const conditions = [];

  // Sales users can only see Available plots
  if (isSales) {
    conditions.push(eq(plotsTable.status, "Available"));
  } else if (params.status) {
    conditions.push(eq(plotsTable.status, params.status));
  }

  if (params.plcType) {
    conditions.push(eq(plotsTable.plcType, params.plcType));
  }

  if (params.plotFacing) {
    conditions.push(eq(plotsTable.plotFacing, params.plotFacing));
  }

  const rawProjectId = Number(req.query.projectId);
  if (Number.isFinite(rawProjectId) && rawProjectId > 0) {
    conditions.push(eq(plotsTable.projectId, rawProjectId));
  }

  const plots =
    conditions.length > 0
      ? await db
          .select()
          .from(plotsTable)
          .where(and(...conditions))
          .orderBy(plotsTable.plotNumber)
      : await db.select().from(plotsTable).orderBy(plotsTable.plotNumber);

  const result = plots.map(serializePlot);

  res.json(result);
});

router.get("/plots/stats", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const rows = await db
    .select({
      status: plotsTable.status,
      plcType: plotsTable.plcType,
      count: sql<number>`count(*)::int`,
    })
    .from(plotsTable)
    .groupBy(plotsTable.status, plotsTable.plcType);

  let total = 0,
    available = 0,
    allotted = 0,
    freeze = 0,
    hold = 0,
    plc = 0,
    nonPlc = 0;

  for (const row of rows) {
    const c = Number(row.count);
    total += c;
    if (row.status === "Available") available += c;
    if (row.status === "Allotted") allotted += c;
    if (row.status === "Freeze") freeze += c;
    if (row.status === "Hold") hold += c;
    if (row.plcType === "PLC") plc += c;
    if (row.plcType === "Non PLC") nonPlc += c;
  }

  res.json({ total, available, allotted, freeze, hold, plc, nonPlc });
});

router.get("/plots/export", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;

  const rawProjectId = Number(req.query.projectId);
  const hasProjectFilter = Number.isFinite(rawProjectId) && rawProjectId > 0;

  const plots = hasProjectFilter
    ? await db
        .select()
        .from(plotsTable)
        .where(eq(plotsTable.projectId, rawProjectId))
        .orderBy(plotsTable.plotNumber)
    : await db.select().from(plotsTable).orderBy(plotsTable.plotNumber);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("PlotFolio Inventory");

  sheet.columns = [
    { header: "Plot Number", key: "plotNumber", width: 15 },
    { header: "Width MTR", key: "widthMtr", width: 12 },
    { header: "Length MTR", key: "lengthMtr", width: 12 },
    { header: "Area SQ MTR", key: "areaSqMtr", width: 14 },
    { header: "Area SQ YRD", key: "areaSqYrd", width: 14 },
    { header: "Plot Facing", key: "plotFacing", width: 14 },
    { header: "PLC Type", key: "plcType", width: 12 },
    { header: "Status", key: "status", width: 12 },
    { header: "Client Name", key: "clientName", width: 20 },
    { header: "Client Phone", key: "clientPhone", width: 16 },
    { header: "Client Email", key: "clientEmail", width: 24 },
    { header: "Login Rate", key: "loginRate", width: 14 },
    { header: "Company Rate", key: "companyRate", width: 14 },
    { header: "Payment Details", key: "paymentDetails", width: 24 },
    { header: "Allotment Date", key: "allotmentDate", width: 16 },
    { header: "BBA Date", key: "bbaDate", width: 16 },
    { header: "Allotment Letter Delivered", key: "allotmentLetterDeliveredDate", width: 22 },
    { header: "BBA Delivered", key: "bbaDeliveredDate", width: 16 },
    { header: "Remarks", key: "remarks", width: 28 },
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  for (const plot of plots) {
    sheet.addRow({
      plotNumber: plot.plotNumber,
      widthMtr: Number(plot.widthMtr),
      lengthMtr: Number(plot.lengthMtr),
      areaSqMtr: Number(plot.areaSqMtr),
      areaSqYrd: Number(plot.areaSqYrd),
      plotFacing: plot.plotFacing,
      plcType: plot.plcType,
      status: plot.status,
      clientName: plot.clientName ?? "",
      clientPhone: plot.clientPhone ?? "",
      clientEmail: plot.clientEmail ?? "",
      loginRate: plot.loginRate !== null ? Number(plot.loginRate) : "",
      companyRate: plot.companyRate !== null ? Number(plot.companyRate) : "",
      paymentDetails: plot.paymentDetails ?? "",
      allotmentDate: fmtDate(plot.allotmentDate),
      bbaDate: fmtDate(plot.bbaDate),
      allotmentLetterDeliveredDate: fmtDate(plot.allotmentLetterDeliveredDate),
      bbaDeliveredDate: fmtDate(plot.bbaDeliveredDate),
      remarks: plot.remarks ?? "",
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="plotfolio-inventory-${new Date().toISOString().slice(0, 10)}.xlsx"`,
  );

  const buffer = await workbook.xlsx.writeBuffer();
  res.send(buffer);
});

router.get("/plots/:id", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPlotParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [plot] = await db
    .select()
    .from(plotsTable)
    .where(eq(plotsTable.id, params.data.id));

  if (!plot) {
    res.status(404).json({ error: "Plot not found" });
    return;
  }

  res.json(serializePlot(plot));
});

router.post("/plots", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;

  const parsed = CreatePlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;

  const rawProjectId = Number(req.body?.projectId);
  if (!Number.isFinite(rawProjectId) || rawProjectId <= 0) {
    res.status(400).json({ error: "A project must be selected for this plot." });
    return;
  }

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, rawProjectId));

  if (!project) {
    res.status(400).json({ error: "Selected project does not exist." });
    return;
  }

  const [{ existingCount }] = await db
    .select({ existingCount: sql<number>`count(*)::int` })
    .from(plotsTable)
    .where(eq(plotsTable.projectId, rawProjectId));

  if (Number(existingCount) >= project.maxPlots) {
    res.status(400).json({
      error: `This project has reached its capacity of ${project.maxPlots} plots.`,
    });
    return;
  }

  const [plot] = await db
    .insert(plotsTable)
    .values({
      plotNumber: data.plotNumber,
      projectId: rawProjectId,
      widthMtr: String(data.widthMtr),
      lengthMtr: String(data.lengthMtr),
      areaSqMtr: String(data.areaSqMtr),
      areaSqYrd: String(data.areaSqYrd),
      plotFacing: data.plotFacing,
      plcType: data.plcType,
      status: data.status,
    })
    .returning();

  // Log activity
  await db.insert(activityLogsTable).values({
    userName: req.session.userName ?? "CRM",
    action: "Added",
    plotNumber: plot.plotNumber,
    oldData: null,
    newData: JSON.stringify({ status: plot.status }),
  });

  broadcastPlotChange("create", plot.id);

  res.status(201).json(serializePlot(plot));
});

router.patch("/plots/:id", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePlotParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Get old plot for activity log
  const [oldPlot] = await db
    .select()
    .from(plotsTable)
    .where(eq(plotsTable.id, params.data.id));

  if (!oldPlot) {
    res.status(404).json({ error: "Plot not found" });
    return;
  }

  const data = parsed.data;
  const updateValues: Record<string, unknown> = {};
  if (data.plotNumber !== undefined) updateValues.plotNumber = data.plotNumber;
  if (data.widthMtr !== undefined) updateValues.widthMtr = String(data.widthMtr);
  if (data.lengthMtr !== undefined) updateValues.lengthMtr = String(data.lengthMtr);
  if (data.areaSqMtr !== undefined) updateValues.areaSqMtr = String(data.areaSqMtr);
  if (data.areaSqYrd !== undefined) updateValues.areaSqYrd = String(data.areaSqYrd);
  if (data.plotFacing !== undefined) updateValues.plotFacing = data.plotFacing;
  if (data.plcType !== undefined) updateValues.plcType = data.plcType;
  if (data.status !== undefined) updateValues.status = data.status;

  // --- CRM fields: not part of the generated schema, read directly off the
  // raw request body. Empty strings clear the field; undefined leaves it untouched.
  const body = req.body ?? {};
  if (body.clientName !== undefined) updateValues.clientName = body.clientName || null;
  if (body.clientPhone !== undefined) updateValues.clientPhone = body.clientPhone || null;
  if (body.clientEmail !== undefined) updateValues.clientEmail = body.clientEmail || null;
  if (body.loginRate !== undefined) {
    updateValues.loginRate = body.loginRate === "" || body.loginRate === null ? null : String(body.loginRate);
  }
  if (body.companyRate !== undefined) {
    updateValues.companyRate = body.companyRate === "" || body.companyRate === null ? null : String(body.companyRate);
  }
  if (body.paymentDetails !== undefined) updateValues.paymentDetails = body.paymentDetails || null;
  if (body.remarks !== undefined) updateValues.remarks = body.remarks || null;

  const allotmentDate = parseOptionalDate(body.allotmentDate);
  if (allotmentDate !== undefined) updateValues.allotmentDate = allotmentDate;
  const bbaDate = parseOptionalDate(body.bbaDate);
  if (bbaDate !== undefined) updateValues.bbaDate = bbaDate;
  const allotmentLetterDeliveredDate = parseOptionalDate(body.allotmentLetterDeliveredDate);
  if (allotmentLetterDeliveredDate !== undefined) updateValues.allotmentLetterDeliveredDate = allotmentLetterDeliveredDate;
  const bbaDeliveredDate = parseOptionalDate(body.bbaDeliveredDate);
  if (bbaDeliveredDate !== undefined) updateValues.bbaDeliveredDate = bbaDeliveredDate;

  const [plot] = await db
    .update(plotsTable)
    .set(updateValues)
    .where(eq(plotsTable.id, params.data.id))
    .returning();

  // Log activity
  const oldSnapshot: Record<string, unknown> = { status: oldPlot.status };
  const newSnapshot: Record<string, unknown> = { status: plot.status };
  if (data.status && data.status !== oldPlot.status) {
    oldSnapshot.status = oldPlot.status;
    newSnapshot.status = data.status;
  }
  if (body.clientName !== undefined && body.clientName !== oldPlot.clientName) {
    oldSnapshot.clientName = oldPlot.clientName;
    newSnapshot.clientName = plot.clientName;
  }

  await db.insert(activityLogsTable).values({
    userName: req.session.userName ?? "CRM",
    action: "Updated",
    plotNumber: plot.plotNumber,
    oldData: JSON.stringify(oldSnapshot),
    newData: JSON.stringify(newSnapshot),
  });

  broadcastPlotChange("update", plot.id);

  res.json(serializePlot(plot));
});

router.delete("/plots/:id", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;

  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePlotParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [plot] = await db
    .delete(plotsTable)
    .where(eq(plotsTable.id, params.data.id))
    .returning();

  if (!plot) {
    res.status(404).json({ error: "Plot not found" });
    return;
  }

  // Log activity
  await db.insert(activityLogsTable).values({
    userName: req.session.userName ?? "CRM",
    action: "Deleted",
    plotNumber: plot.plotNumber,
    oldData: JSON.stringify({ status: plot.status }),
    newData: null,
  });

  broadcastPlotChange("delete", plot.id);

  res.sendStatus(204);
});

export default router;
