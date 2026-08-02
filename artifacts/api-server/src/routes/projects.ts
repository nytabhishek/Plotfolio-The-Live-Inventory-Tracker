import { Router, type IRouter } from "express";
import { db, projectsTable, plotsTable, eq, sql } from "@workspace/db";

const router: IRouter = Router();

const MAX_PROJECTS = 5;

function requireAuth(req: any, res: any): boolean {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return false;
  }
  return true;
}

function requireCrm(req: any, res: any): boolean {
  if (!req.session?.userId || req.session.userType !== "crm") {
    res.status(403).json({ error: "CRM access required" });
    return false;
  }
  return true;
}

// List all projects, with a live plot count for each one.
router.get("/projects", async (req, res): Promise<void> => {
  if (!requireAuth(req, res)) return;

  const rows = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      maxPlots: projectsTable.maxPlots,
      createdAt: projectsTable.createdAt,
      plotCount: sql<number>`count(${plotsTable.id})::int`,
    })
    .from(projectsTable)
    .leftJoin(plotsTable, eq(plotsTable.projectId, projectsTable.id))
    .groupBy(projectsTable.id)
    .orderBy(projectsTable.id);

  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      maxPlots: r.maxPlots,
      plotCount: Number(r.plotCount),
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

// Create a new project. CRM only. Capped at MAX_PROJECTS total.
router.post("/projects", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    res.status(400).json({ error: "Project name is required" });
    return;
  }

  const rawMaxPlots = Number(req.body?.maxPlots);
  const maxPlots = Number.isFinite(rawMaxPlots) && rawMaxPlots > 0 ? rawMaxPlots : 200;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(projectsTable);

  if (Number(count) >= MAX_PROJECTS) {
    res.status(400).json({
      error: `Maximum of ${MAX_PROJECTS} projects allowed. Delete an existing project before adding a new one.`,
    });
    return;
  }

  try {
    const [project] = await db
      .insert(projectsTable)
      .values({ name, maxPlots })
      .returning();

    res.status(201).json({
      id: project.id,
      name: project.name,
      maxPlots: project.maxPlots,
      plotCount: 0,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "A project with this name already exists" });
      return;
    }
    throw err;
  }
});

// Rename a project. CRM only.
router.patch("/projects/:id", async (req, res): Promise<void> => {
  if (!requireCrm(req, res)) return;

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }

  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  if (!name) {
    res.status(400).json({ error: "Project name is required" });
    return;
  }

  try {
    const [project] = await db
      .update(projectsTable)
      .set({ name })
      .where(eq(projectsTable.id, id))
      .returning();

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({
      id: project.id,
      name: project.name,
      maxPlots: project.maxPlots,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "A project with this name already exists" });
      return;
    }
    throw err;
  }
});

export default router;
