import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { store } from '../services/store.js';
import { signToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['assistant', 'client']).default('assistant'),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  company: z.string().optional().default('Vortex Dynamics'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const DemoLoginSchema = z.object({
  role: z.enum(['assistant', 'client']).default('assistant'),
});

/**
 * Sets the secure JWT authentication cookie on response
 */
function setAuthCookie(res, token) {
  const sameSite = env.COOKIE_SAMESITE || (env.NODE_ENV === 'production' ? 'none' : 'lax');
  const isSecure = sameSite === 'none' ? true : env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

/**
 * Handle new user registration
 */
export async function signup(req, res, next) {
  try {
    const { email, password, name, role, clientName, clientEmail, company } = req.body;

    const normalizedEmail = (email || '').toLowerCase().trim();
    if (
      normalizedEmail === 'maya@vortexdynamics.com' ||
      normalizedEmail === 'priya@vortexdynamics.com'
    ) {
      return res.status(400).json({
        ok: false,
        error: {
          message:
            "This is a reserved demo account. Use the 'Try Demo' buttons on the login page to access it.",
          code: 'RESERVED_DEMO_ACCOUNT',
        },
      });
    }

    const existing = await store.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({
        ok: false,
        error: { message: 'An account with this email already exists.', code: 'EMAIL_IN_USE' },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const orgId = 'org_' + Date.now();

    let clientId = null;
    if (role === 'assistant') {
      // Create associated client profile for this assistant
      const clientDoc = {
        _id: 'client_' + Date.now(),
        orgId,
        name: clientName || 'Executive Client',
        email: clientEmail || 'executive@' + (company ? company.toLowerCase().replace(/\s+/g, '') + '.com' : 'example.com'),
        title: 'Executive / CEO',
        company: company || 'My Company',
        playbook: {
          vipSenders: [],
          vipDomains: [],
          topicRules: [],
          financialThresholds: { maxAssistantApprovalUsd: 1000 },
          customInstructions: '',
          updatedAt: new Date(),
        },
      };
      clientId = clientDoc._id;
    }

    const user = await store.createUser({
      email,
      passwordHash,
      name,
      role,
      orgId,
      clientId,
      avatarUrl: null,
      preferences: { notificationsEnabled: true, theme: 'editorial', keyboardShortcutsEnabled: true },
    });

    const token = signToken({ userId: user._id, role: user.role, orgId: user.orgId });
    setAuthCookie(res, token);

    // Ensure demo agent runs are hydrated on first demo login
    const existingRuns = await store.getAgentRuns({ orgId: user.orgId, limit: 1 });
    if (!existingRuns || existingRuns.length === 0) {
      await store.initSeedData?.();
    }

    return res.status(201).json({
      ok: true,
      data: {
        user: { _id: user._id, email: user.email, name: user.name, role: user.role, orgId: user.orgId, clientId: user.clientId },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle standard email + password login
 */
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await store.findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        ok: false,
        error: { message: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' },
      });
    }

    const token = signToken({ userId: user._id, role: user.role, orgId: user.orgId });
    setAuthCookie(res, token);

    // Ensure demo agent runs are hydrated on first demo login
    const existingRuns = await store.getAgentRuns({ orgId: user.orgId, limit: 1 });
    if (!existingRuns || existingRuns.length === 0) {
      await store.initSeedData?.();
    }

    return res.status(200).json({
      ok: true,
      data: {
        user: { _id: user._id, email: user.email, name: user.name, role: user.role, orgId: user.orgId, clientId: user.clientId },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle 1-click instant demo login for reviewers
 */
export async function demoLogin(req, res, next) {
  try {
    const role = req.body?.role || req.query?.role || 'assistant'; // 'assistant' or 'client'
    const targetEmail = role === 'client' ? 'priya@vortexdynamics.com' : 'maya@vortexdynamics.com';
    let user = await store.findUserByEmail(targetEmail);

    if (!user) {
      // Re-init demo data if needed
      await store.initSeedData?.();
      user = await store.findUserByEmail(targetEmail);
    }

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Demo user not found', code: 'USER_NOT_FOUND' },
      });
    }

    const token = signToken({ userId: user._id, role: user.role, orgId: user.orgId });
    setAuthCookie(res, token);

    // Ensure demo agent runs are hydrated on first demo login
    const existingRuns = await store.getAgentRuns({ orgId: user.orgId, limit: 1 });
    if (!existingRuns || existingRuns.length === 0) {
      await store.initSeedData?.();
    }

    logger.info({ role: user.role, email: user.email }, '[Auth] Demo login successful');

    return res.status(200).json({
      ok: true,
      data: {
        user: { _id: user._id, email: user.email, name: user.name, role: user.role, orgId: user.orgId, clientId: user.clientId },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieve current user session and linked client details
 */
export async function getMe(req, res, next) {
  try {
    const user = req.user;
    const client = await store.getClientByOrgId(user.orgId);
    return res.status(200).json({
      ok: true,
      data: {
        user: { _id: user._id, email: user.email, name: user.name, role: user.role, orgId: user.orgId, clientId: user.clientId },
        client,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Clear session cookie and logout
 */
export function logout(req, res) {
  const sameSite = env.COOKIE_SAMESITE || (env.NODE_ENV === 'production' ? 'none' : 'lax');
  const isSecure = sameSite === 'none' ? true : env.NODE_ENV === 'production';
  res.clearCookie('token', {
    path: '/',
    httpOnly: true,
    secure: isSecure,
    sameSite,
  });
  return res.status(200).json({ ok: true, message: 'Logged out successfully' });
}

/**
 * Generate client invitation code and link
 */
export async function createInvite(req, res, next) {
  try {
    const { email } = req.body;
    const token = crypto.randomBytes(16).toString('hex');
    const code = 'INV-' + Math.floor(100000 + Math.random() * 900000);

    const invite = await store.createInvite({
      orgId: req.user.orgId,
      email: email.toLowerCase(),
      role: 'client',
      token,
      code,
      invitedBy: req.user._id,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });

    return res.status(201).json({
      ok: true,
      data: {
        code: invite.code,
        token: invite.token,
        inviteUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${invite.code}`,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
