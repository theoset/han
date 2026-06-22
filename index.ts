import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import jobsRouter from "./jobs";
import workersRouter from "./workers";
import servicesRouter from "./services";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(jobsRouter);
router.use(workersRouter);
router.use(servicesRouter);

export default router;
