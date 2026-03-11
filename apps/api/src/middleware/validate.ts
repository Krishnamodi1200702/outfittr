import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.');
          if (!errors[key]) errors[key] = [];
          errors[key].push(issue.message);
        }
        res.status(400).json({ message: 'Validation failed', errors });
        return;
      }
      next(err);
    }
  };
}
