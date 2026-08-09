import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import plotsRouter from "./plots";
import projectsRouter from "./projects";
import paymentsRouter from "./payments";
import rmCodesRouter from "./rmCodes";
import activityLogsRouter from "./activityLogs";
import eventsRouter from "./events";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(plotsRouter);
router.use(projectsRouter);
router.use(paymentsRouter);
router.use(rmCodesRouter);
router.use(activityLogsRouter);
router.use(eventsRouter);

export default router;
