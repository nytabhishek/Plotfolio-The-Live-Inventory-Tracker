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

  const result = plots.map((p) => ({
    id: p.id,
    plotNumber: p.plotNumber,
    projectId: p.projectId,
    widthMtr: Number(p.widthMtr),
    lengthMtr: Number(p.lengthMtr),
    areaSqMtr: Number(p.areaSqMtr),
    areaSqYrd: Number(p.areaSqYrd),
    plotFacing: p.plotFacing,
    plcType: p.plcType,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

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

  const plots = await db.select().from(plotsTable).orderBy(plotsTable.plotNumber);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Dream Valley Inventory");

  sheet.columns = [
    { header: "Plot Number", key: "plotNumber", width: 15 },
    { header: "Width MTR", key: "widthMtr", width: 12 },
    { header: "Length MTR", key: "lengthMtr", width: 12 },
    { header: "Area SQ MTR", key: "areaSqMtr", width: 14 },
    { header: "Area SQ YRD", key: "areaSqYrd", width: 14 },
    { header: "Plot Facing", key: "plotFacing", width: 14 },
    { header: "PLC Type", key: "plcType", width: 12 },
    { header: "Status", key: "status", width: 12 },
  ];

  // Style header row
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A5F" },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

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
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="dream-valley-inventory-${new Date().toISOString().slice(0, 10)}.xlsx"`,
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

  res.json({
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
    createdAt: plot.createdAt.toISOString(),
    updatedAt: plot.updatedAt.toISOString(),
  });
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

  res.status(201).json({
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
    createdAt: plot.createdAt.toISOString(),
    updatedAt: plot.updatedAt.toISOString(),
  });
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

  const [plot] = await db
    .update(plotsTable)
    .set(updateValues)
    .where(eq(plotsTable.id, params.data.id))
    .returning();

  // Log activity
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  if (data.status && data.status !== oldPlot.status) {
    changes.status = { old: oldPlot.status, new: data.status };
  }

  await db.insert(activityLogsTable).values({
    userName: req.session.userName ?? "CRM",
    action: "Updated",
    plotNumber: plot.plotNumber,
    oldData: JSON.stringify({ status: oldPlot.status }),
    newData: JSON.stringify({ status: plot.status }),
  });

  broadcastPlotChange("update", plot.id);

  res.json({
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
    createdAt: plot.createdAt.toISOString(),
    updatedAt: plot.updatedAt.toISOString(),
  });
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
