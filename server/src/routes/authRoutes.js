import express from 'express';
import { z } from 'zod';
import {
  signup,
  login,
  demoLogin,
  getMe,
  logout,
  createInvite,
  SignupSchema,
  LoginSchema,
  DemoLoginSchema,
} from '../controllers/authController.js';
import { authRequired, roleRequired, validate, authRateLimiter } from '../middleware/index.js';

const router = express.Router();

const InviteClientSchema = z.object({
  email: z.string().email().optional(),
});

router.post('/signup', authRateLimiter, validate(SignupSchema), signup);
router.post('/login', authRateLimiter, validate(LoginSchema), login);
router.post('/demo-login', validate(DemoLoginSchema), demoLogin);
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
