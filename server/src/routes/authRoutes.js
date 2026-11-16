import express from 'express';
import { z } from 'zod';
import {
  signup,
  login,
  demoLogin,
  getMe,
  logout,
  getClients,
  createInvite,
  getClientProfile,
  updateClientProfile,
  resendInvite,
  revokeInvite,
  validateInviteToken,
  acceptInvite,
  getAuthStatus,
  SignupSchema,
  LoginSchema,
  DemoLoginSchema,
} from '../controllers/authController.js';
import { authRequired, roleRequired, validate, authRateLimiter, loginRateLimiter } from '../middleware/index.js';

const router = express.Router();

const InviteClientSchema = z.object({
  clientId: z.string().optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
});

const UpdateClientProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
});

const AcceptInviteSchema = z.object({
  password: z.string().min(10, 'Password must be at least 10 characters long'),
});

router.post('/signup', authRateLimiter, validate(SignupSchema), signup);
router.post('/login', loginRateLimiter, validate(LoginSchema), login);
router.post('/demo-login', validate(DemoLoginSchema), demoLogin);
router.get('/status', getAuthStatus);
router.get('/me', authRequired, getMe);
router.post('/logout', logout);

// Assistant Client Profile & Invite Management
router.get('/clients', authRequired, roleRequired(['assistant']), getClients);
router.get('/client-profile', authRequired, roleRequired(['assistant']), getClientProfile);
router.put(
  '/client-profile',
  authRequired,
  roleRequired(['assistant']),
  validate(UpdateClientProfileSchema),
  updateClientProfile
);
router.post(
  '/invite-client',
  authRequired,
  roleRequired(['assistant']),
  validate(InviteClientSchema),
  createInvite
);
router.post('/resend-invite', authRequired, roleRequired(['assistant']), resendInvite);
router.post('/revoke-invite', authRequired, roleRequired(['assistant']), revokeInvite);

// Public Client Invite Validation & Acceptance
router.get('/invite/:token', validateInviteToken);
router.post(
  '/invite/:token/accept',
  authRateLimiter,
  validate(AcceptInviteSchema),
  acceptInvite
);

export default router;
