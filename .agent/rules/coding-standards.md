# Rule: Technical & Coding Standards

1. **Stack**: Node 20+, native ES modules (`"type": "module"`), plain JavaScript only. No TypeScript.
2. **File Size**: Small, focused files (< 200 lines). One responsibility per module.
3. **Validation**: All incoming requests (body, query, params) must be validated with **Zod** schemas.
4. **JSDoc**: Every service function, controller, and utility must have explicit JSDoc tags specifying types, parameters, return objects, and errors.
5. **Error Handling**: Use the centralized error handler (`errorHandler.js`). Return standard format `{ ok: false, error: { message, code } }`.
6. **Code Cleanliness**: Async/await only. Zero dead code. No unhandled promise rejections. No orphan console statements.
7. **Security**: Encrypt OAuth tokens at rest with **AES-256-GCM** using `TOKEN_ENCRYPTION_KEY`.
8. **Logging**: Never log email bodies in Pino logs.
