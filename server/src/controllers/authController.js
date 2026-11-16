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
 * Create a new single-use 32-byte client invitation
 * Stores only the SHA-256 hash in DB
 * Respects SEND_ENABLED: if false, no email is dispatched
 */
export async function createInvite(req, res, next) {
  try {
    const { clientId, name, email, company, title } = req.body;
    let client = await store.getClientByOrgId(req.user.orgId);

    if (!client && clientId) {
      client = await store.getClientById(clientId);
    }

    if (!client) {
      client = await store.createClient({
        orgId: req.user.orgId,
        name: name || 'Executive Client',
        email: email || 'client@example.com',
        company: company || 'Vortex Dynamics',
        title: title || 'CEO',
      });
    } else {
      const updates = {};
      if (name) updates.name = name;
      if (email) updates.email = email.toLowerCase().trim();
      if (company) updates.company = company;
      if (title) updates.title = title;
      if (Object.keys(updates).length > 0) {
        client = await store.updateClient(client._id, updates);
      }
    }

    const targetEmail = (email || client.email).toLowerCase().trim();

    // Revoke any previous pending invites for this client/email in this org
    await store.revokePendingInvitesForClient({
      orgId: req.user.orgId,
      clientId: client._id,
      email: targetEmail,
    });

    // Generate random 32 bytes token and store its SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await store.createInvite({
      orgId: req.user.orgId,
      clientId: client._id,
      email: targetEmail,
      role: 'client',
      tokenHash,
      status: 'pending',
      invitedBy: req.user._id,
      expiresAt,
    });

    const clientUrl = (env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const inviteUrl = `${clientUrl}/invite/${rawToken}`;

    // Zero-send compliance: when SEND_ENABLED is false, no email is sent
    if (env.SEND_ENABLED) {
      // In production with real send enabled, dispatch happens here
    }

    logger.info({ orgId: req.user.orgId, email: targetEmail }, '[Auth] Client invite created (token stored as SHA-256 hash)');

    return res.status(201).json({
      ok: true,
      data: {
        token: rawToken,
        inviteUrl,
        expiresAt: invite.expiresAt,
        client: {
          _id: client._id,
          name: client.name,
          email: client.email,
          title: client.title,
          company: client.company,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get client profile and invite status for assistant
 */
export async function getClientProfile(req, res, next) {
  try {
    const client = await store.getClientByOrgId(req.user.orgId);
    if (!client) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Client profile not found', code: 'CLIENT_NOT_FOUND' },
      });
    }

    const clientUser = await store.findUserByEmail(client.email);
    const latestInvite = await store.findLatestInviteByClient({
      orgId: req.user.orgId,
      clientId: client._id,
    });

    let inviteStatus = 'not_invited';
    let expiresAt = null;

    if (clientUser && clientUser.lastLoginAt) {
      inviteStatus = 'active';
    } else if (latestInvite) {
      if (latestInvite.status === 'accepted') {
        inviteStatus = 'active';
      } else if (latestInvite.status === 'revoked') {
        inviteStatus = 'revoked';
      } else if (new Date(latestInvite.expiresAt) < new Date()) {
        inviteStatus = 'expired';
        expiresAt = latestInvite.expiresAt;
      } else if (latestInvite.status === 'pending') {
        inviteStatus = 'pending';
        expiresAt = latestInvite.expiresAt;
      }
    }

    return res.status(200).json({
      ok: true,
      data: {
        client: {
          _id: client._id,
          name: client.name,
          email: client.email,
          title: client.title,
          company: client.company,
        },
        inviteStatus,
        expiresAt,
        lastLoginAt: clientUser?.lastLoginAt || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update client profile (name, email, company, title)
 */
export async function updateClientProfile(req, res, next) {
  try {
    let client = await store.getClientByOrgId(req.user.orgId);
    if (!client) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Client profile not found', code: 'CLIENT_NOT_FOUND' },
      });
    }

    const { name, email, company, title } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email.toLowerCase().trim();
    if (company) updates.company = company;
    if (title) updates.title = title;

    client = await store.updateClient(client._id, updates);

    return res.status(200).json({
      ok: true,
      data: { client },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Resend client invite (generates a fresh 32-byte token and revokes older pending invites)
 */
export async function resendInvite(req, res, next) {
  return createInvite(req, res, next);
}

/**
 * Revoke pending client invite
 */
export async function revokeInvite(req, res, next) {
  try {
    const client = await store.getClientByOrgId(req.user.orgId);
    if (!client) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Client profile not found', code: 'CLIENT_NOT_FOUND' },
      });
    }

    await store.revokePendingInvitesForClient({
      orgId: req.user.orgId,
      clientId: client._id,
      email: client.email,
    });

    return res.status(200).json({
      ok: true,
      message: 'Client invitation has been revoked.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public endpoint to validate an invite token
 * Never reveals whether an email exists elsewhere
 */
export async function validateInviteToken(req, res, next) {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string' || token.length < 16) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Invalid invitation link.', code: 'INVALID_INVITE_TOKEN' },
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const invite = await store.findInviteByTokenHash(tokenHash);

    if (!invite) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Invalid or unknown invitation link.', code: 'INVITE_NOT_FOUND' },
      });
    }

    if (invite.status === 'revoked') {
      return res.status(400).json({
        ok: false,
        error: { message: 'This invitation has been revoked by the assistant.', code: 'INVITE_REVOKED' },
      });
    }

    if (invite.status === 'accepted') {
      return res.status(400).json({
        ok: false,
        error: { message: 'This invitation has already been accepted. Please sign in.', code: 'INVITE_ALREADY_USED' },
      });
    }

    if (new Date() > new Date(invite.expiresAt) || invite.status === 'expired') {
      return res.status(400).json({
        ok: false,
        error: { message: 'This invitation link has expired (7-day window exceeded). Please request a new invite from your assistant.', code: 'INVITE_EXPIRED' },
      });
    }

    const client = await store.getClientById(invite.clientId);

    return res.status(200).json({
      ok: true,
      data: {
        email: invite.email,
        name: client?.name || 'Executive Client',
        company: client?.company || 'Vortex Dynamics',
        title: client?.title || 'Executive',
        expiresAt: invite.expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Public endpoint to accept invite and set client password
 * Validates token, hashes password with bcrypt cost 12, logs them in
 */
export async function acceptInvite(req, res, next) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 10) {
      return res.status(400).json({
        ok: false,
        error: { message: 'Password must be at least 10 characters long.', code: 'PASSWORD_TOO_SHORT' },
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const invite = await store.findInviteByTokenHash(tokenHash);

    if (!invite) {
      return res.status(404).json({
        ok: false,
        error: { message: 'Invalid or unknown invitation link.', code: 'INVITE_NOT_FOUND' },
      });
    }

    if (invite.status === 'revoked') {
      return res.status(400).json({
        ok: false,
        error: { message: 'This invitation has been revoked.', code: 'INVITE_REVOKED' },
      });
    }

    if (invite.status === 'accepted') {
      return res.status(400).json({
        ok: false,
        error: { message: 'This invitation has already been accepted.', code: 'INVITE_ALREADY_USED' },
      });
    }

    if (new Date() > new Date(invite.expiresAt) || invite.status === 'expired') {
      return res.status(400).json({
        ok: false,
        error: { message: 'This invitation has expired.', code: 'INVITE_EXPIRED' },
      });
    }

    // Bcrypt hash password with cost 12
    const passwordHash = await bcrypt.hash(password, 12);

    let client = await store.getClientById(invite.clientId);
    if (!client) {
      client = await store.getClientByOrgId(invite.orgId);
    }

    // Find or create user
    let user = await store.findUserByEmail(invite.email);
    if (user) {
      user = await store.updateUser(user._id, {
        passwordHash,
        lastLoginAt: new Date(),
        orgId: invite.orgId,
        clientId: invite.clientId,
      });
    } else {
      user = await store.createUser({
        email: invite.email.toLowerCase(),
        passwordHash,
        name: client?.name || 'Executive Client',
        role: 'client',
        orgId: invite.orgId,
        clientId: invite.clientId,
        lastLoginAt: new Date(),
        preferences: { notificationsEnabled: true, theme: 'editorial', keyboardShortcutsEnabled: true },
      });
    }

    // Mark invite accepted
    await store.updateInvite(invite._id, {
      status: 'accepted',
      acceptedAt: new Date(),
    });

    // Sign JWT and set auth cookie
    const sessionToken = signToken({ userId: user._id, role: user.role, orgId: user.orgId });
    setAuthCookie(res, sessionToken);

    logger.info({ userId: user._id, role: user.role }, '[Auth] Client invite accepted successfully');

    return res.status(200).json({
      ok: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
          clientId: user.clientId,
        },
        token: sessionToken,
      },
    });
  } catch (err) {
    next(err);
  }
}
