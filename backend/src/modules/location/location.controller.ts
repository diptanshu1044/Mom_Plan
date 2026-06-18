import { Request, Response, NextFunction } from 'express';
import { zipValidationService } from '../../services/zipValidation.service';

export class LocationController {
  async validateZip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { zip, state } = req.body as { zip: string; state: string };
      const result = await zipValidationService.validateZip(zip, state);

      res.status(200).json({
        success: true,
        data: {
          valid: result.valid,
          city: result.city ?? null,
          state: result.state ?? null,
          zip: result.zip ?? null,
          error: result.error ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
