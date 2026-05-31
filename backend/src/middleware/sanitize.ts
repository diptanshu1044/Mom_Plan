import { Request, Response, NextFunction } from 'express';

/**
 * Fields that must NEVER appear in API responses or logs.
 * These are stripped recursively from any JSON response body.
 */
const SENSITIVE_FIELDS = [
  'ssn_last_four',
  'ssn',
  'social_security',
  'password',
  'password_hash',
  'credit_card',
  'card_number',
  'cvv',
  'bank_account',
  'routing_number',
];

/**
 * Recursively strips sensitive fields from a plain object or array.
 */
export function sanitizeObject(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === 'object') {
    // If the object has a custom toJSON method (like Decimal or Date), call it
    // and recursively sanitize the serialized output.
    if (typeof (obj as any).toJSON === 'function') {
      return sanitizeObject((obj as any).toJSON());
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
        // Replace with masked sentinel — never expose real value
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Strips PII patterns from log strings (SSN patterns, card-like numbers, etc.).
 */
export function sanitizeLogMessage(msg: string): string {
  return msg
    // SSN full pattern: 123-45-6789
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]')
    // SSN last four: ssn_last_four=1234 or "ssn_last_four":"1234"
    .replace(/(ssn_last_four["\s]*[:=]["\s]*)(\d{4})/gi, '$1[REDACTED]')
    // Password hash patterns (bcrypt)
    .replace(/\$2[aby]\$\d+\$[./A-Za-z0-9]{53}/g, '[HASH-REDACTED]')
    // Bearer tokens in log strings
    .replace(/Bearer\s+[A-Za-z0-9\-_.~+/]+=*/g, 'Bearer [TOKEN-REDACTED]')
    // Credit card-like numbers
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD-REDACTED]');
}

/**
 * Express middleware that intercepts `res.json()` and sanitizes the response
 * body before it is sent to the client. Runs on every route automatically.
 *
 * This is the last line of defence against accidental PII leakage through
 * serialised Prisma objects (e.g. `ssn_last_four`, `password_hash`).
 */
export const responseSanitizer = (req: Request, res: Response, next: NextFunction): void => {
  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    const sanitized = sanitizeObject(body);
    return originalJson(sanitized);
  };

  next();
};

/**
 * Audit-safe logger: wraps console.error so sensitive values are stripped
 * before any log line reaches stdout/stderr or external log aggregators.
 */
export function createSafeLogger() {
  return {
    info: (msg: string, ...args: unknown[]) => {
      console.info('[INFO]', sanitizeLogMessage(String(msg)), ...args);
    },
    warn: (msg: string, ...args: unknown[]) => {
      console.warn('[WARN]', sanitizeLogMessage(String(msg)), ...args);
    },
    error: (msg: string, ...args: unknown[]) => {
      const sanitizedArgs = args.map((a) => {
        if (a instanceof Error) return { name: a.name, message: sanitizeLogMessage(a.message) };
        if (typeof a === 'string') return sanitizeLogMessage(a);
        return a;
      });
      console.error('[ERROR]', sanitizeLogMessage(String(msg)), ...sanitizedArgs);
    },
  };
}

export const safeLogger = createSafeLogger();
