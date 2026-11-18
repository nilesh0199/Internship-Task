import { z } from 'zod';

/**
 * Strict JSON Action Protocol Schema
 * Each agent loop iteration must produce a response conforming to this schema.
 */
export const ActionProtocolSchema = z
  .object({
    thought_summary: z
      .string()
      .max(200, 'thought_summary must be at most 200 characters')
      .describe('Brief rationale of the current step (<=200 chars), not raw chain of thought'),
    action: z.enum(['tool', 'final']).describe("'tool' to invoke a tool, or 'final' to finish with result"),
    tool: z.string().optional().describe('Name of the tool to invoke if action is tool'),
    args: z.record(z.any()).optional().default({}).describe('Arguments for the chosen tool'),
    final: z.record(z.any()).optional().describe('Final structured result object if action is final'),
  })
  .superRefine((data, ctx) => {
    if (data.action === 'tool') {
      if (!data.tool || typeof data.tool !== 'string' || data.tool.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "When action is 'tool', 'tool' is required and must name a valid permitted tool",
          path: ['tool'],
        });
      }
    }
    if (data.action === 'final') {
      if (data.final === undefined || data.final === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "When action is 'final', 'final' object is required",
          path: ['final'],
        });
      }
    }
  });

/**
 * Parses and validates an action protocol string, handling markdown fences
 * @param {string|Object} raw
 * @returns {{ success: boolean, data?: Object, error?: string }}
 */
export function parseActionProtocol(raw) {
  let parsedObj;
  if (typeof raw === 'object' && raw !== null) {
    parsedObj = raw;
  } else if (typeof raw === 'string') {
    let cleaned = raw.trim();
    // Strip markdown code fences if model wrapped in ```json ... ```
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }
    try {
      parsedObj = JSON.parse(cleaned);
    } catch (jsonErr) {
      return { success: false, error: `Invalid JSON: ${jsonErr.message}` };
    }
  } else {
    return { success: false, error: 'Expected JSON string or object' };
  }

  const result = ActionProtocolSchema.safeParse(parsedObj);
  if (!result.success) {
    const errorMsg = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { success: false, error: `Schema validation failed: ${errorMsg}` };
  }

  return { success: true, data: result.data };
}
