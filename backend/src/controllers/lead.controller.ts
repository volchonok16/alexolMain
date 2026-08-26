import { Response } from 'express';
import { LeadService } from '../services/lead.service.js';
import { AuthRequest } from '../types/index.js';
import { updateLeadSchema } from '../validators/lead.validator.js';

export class LeadController {
  private service = new LeadService();

  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 20);
      const result = await this.service.findAll(page, limit);
      res.json({ data: result.data, total: result.total, page, limit });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const lead = await this.service.findById(req.params.id);
      res.json({ data: lead });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const data = updateLeadSchema.parse(req.body);
      const lead = await this.service.update(req.params.id, data);
      res.json({ data: lead });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  delete = async (req: AuthRequest, res: Response) => {
    try {
      await this.service.delete(req.params.id);
      res.json({ message: 'Lead deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
