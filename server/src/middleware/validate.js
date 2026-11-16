/**
 * Middleware factory for strict Zod input validation
 * @param {import('zod').ZodSchema} schema 
 * @param {'body'|'query'|'params'} [source='body']
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const rawData = req[source] !== undefined ? req[source] : (source === 'body' || source === 'query' ? {} : req[source]);
    const result = schema.safeParse(rawData);
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
