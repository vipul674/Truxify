import express from 'express';
import { registerDeviceToken } from '../controllers/deviceController.js';

const router = express.Router();

// POST /api/devices/register
router.post('/register', registerDeviceToken);

export default router;