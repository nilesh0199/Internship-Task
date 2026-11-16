import express from 'express';
import {
  connectGoogle,
  googleCallback,
  connectMicrosoft,
  microsoftCallback,
  listAccounts,
  syncAccount,
  disconnectAccount,
  simulateInboundMessage,
} from '../controllers/providerController.js';
import { authRequired } from '../middleware/index.js';

const router = express.Router();

// OAuth Handshakes
router.get('/connect/google', authRequired, connectGoogle);
router.get('/auth/google/callback', googleCallback);

router.get('/connect/microsoft', authRequired, connectMicrosoft);
router.get('/auth/microsoft/callback', microsoftCallback);

// Account Management
router.get('/accounts', authRequired, listAccounts);
router.post('/accounts/:id/sync', authRequired, syncAccount);
router.post('/accounts/:id/disconnect', authRequired, disconnectAccount);

// Demo Simulated Follow-Up Message Injector
router.post('/demo/simulate-message', authRequired, simulateInboundMessage);

export default router;
