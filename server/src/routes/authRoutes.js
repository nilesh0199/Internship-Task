import express from 'express';
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
import { authRequired, validate, authRateLimiter } from '../middleware/index.js';

const router = express.Router();

router.post('/signup', authRateLimiter, validate(SignupSchema), signup);
router.post('/login', authRateLimiter, validate(LoginSchema), login);
router.post('/demo-login', validate(DemoLoginSchema), demoLogin);
router.post('/switch-role', authRequired, switchRole);
router.get('/me', authRequired, getMe);
router.post('/logout', logout);
router.post('/invite-client', authRequired, createInvite);

export default router;
