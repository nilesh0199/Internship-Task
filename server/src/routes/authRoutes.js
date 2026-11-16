import express from 'express';
import { z } from 'zod';
import {
  signup,
  login,
  demoLogin,
  switchRole,
  getMe,
  logout,
  createInvite,
  SignupSchema,
  LoginSchema,
  DemoLoginSchema,
} from '../controllers/authController.js';
import { authRequired, roleRequired, validate, authRateLimiter } from '../middleware/index.js';

const router = express.Router();

const SwitchRoleSchema = z
  .union([
    z
      .object({
        role: z.string().optional(),
        targetRole: z.string().optional(),
      })
      .passthrough(),
    z.undefined(),
    z.null(),
  ])
  .optional()
  .default({});

const InviteClientSchema = z.object({
  email: z.string().email().optional(),
});

router.post('/signup', authRateLimiter, validate(SignupSchema), signup);
router.post('/login', authRateLimiter, validate(LoginSchema), login);
router.post('/demo-login', validate(DemoLoginSchema), demoLogin);
router.post('/switch-role', authRequired, validate(SwitchRoleSchema), switchRole);
router.get('/me', authRequired, getMe);
router.post('/logout', logout);
router.post(
  '/invite-client',
  authRequired,
  roleRequired(['assistant']),
  validate(InviteClientSchema),
  createInvite
);

export default router;
