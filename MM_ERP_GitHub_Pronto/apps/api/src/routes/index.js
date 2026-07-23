import { Router } from 'express';
import healthCheck from './health-check.js';
import leadsRouter from './leads.js';

const router = Router();

export default () => {
    router.get('/health', healthCheck);
    router.use('/leads', leadsRouter);

    return router;
};