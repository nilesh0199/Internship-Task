/**
 * Middleware factory for strict Zod input validation
 * @param {import('zod').ZodSchema} schema 
 * @param {'body'|'query'|'params'} [source='body']
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: {
          message: 'Validation failed for request ' + source,
          code: 'VALIDATION_ERROR',
          details: result.error.format(),
        },
      });
    }
    req[source] = result.data;
    next();
  };
}
