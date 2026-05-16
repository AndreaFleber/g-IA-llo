import { Router, type IRouter } from "express";
import healthRouter from "./health";
import charactersRouter from "./characters";
import interrogationsRouter from "./interrogations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(charactersRouter);
router.use(interrogationsRouter);

export default router;
