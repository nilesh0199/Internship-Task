import express from 'express';
import { z } from 'zod';
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
import { authRequired, roleRequired, validate } from '../middleware/index.js';

const router = express.Router();

const AccountIdParamSchema = z.object({
  id: z.string().min(1),
});

const DisconnectBodySchema = z
  .object({
    purge: z.boolean().optional(),
  })
  .optional();

const SimulateMessageSchema = z
  .object({
    threadId: z.string().min(1).optional(),
  })
  .optional();

// OAuth Handshakes (Assistant Only)
router.get('/connect/google', authRequired, roleRequired(['assistant']), connectGoogle);
router.get('/auth/google/callback', googleCallback);

router.get('/connect/microsoft', authRequired, roleRequired(['assistant']), connectMicrosoft);
router.get('/auth/microsoft/callback', microsoftCallback);

// Account Management
router.get('/accounts', authRequired, listAccounts);
router.post(
  '/accounts/:id/sync',
  authRequired,
  roleRequired(['assistant']),
  validate(AccountIdParamSchema, 'params'),
  syncAccount
);
router.post(
  '/accounts/:id/disconnect',
  authRequired,
  roleRequired(['assistant']),
  validate(AccountIdParamSchema, 'params'),
  validate(DisconnectBodySchema),
  disconnectAccount
);

// Demo Simulated Follow-Up Message Injector (Assistant Only)
router.post(
  '/demo/simulate-message',
  authRequired,
  roleRequired(['assistant']),
  validate(SimulateMessageSchema),
  simulateInboundMessage
);

export default router;
