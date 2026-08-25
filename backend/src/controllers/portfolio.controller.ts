import { Response } from 'express';
import { PortfolioService } from '../services/portfolio.service.js';
import { AuthRequest } from '../types/index.js';
import { createPortfolioSchema, updatePortfolioSchema } from '../validators/portfolio.validator.js';
import { removeTempFile } from '../utils/minioStorage.js';

export class PortfolioController {
  private service = new PortfolioService();

  create = async (req: AuthRequest, res: Response) => {
    try {
      const data = createPortfolioSchema.parse(req.body);
      const image = req.file;
      if (!image) return res.status(400).json({ error: 'Image is required' });

      const item = await this.service.create({ ...data, image });
      res.status(201).json({ data: item });
    } catch (error: any) {
      if (req.file) await removeTempFile(req.file.path);
      res.status(400).json({ error: error.message });
    }
  };

  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 100));
      const result = await this.service.findAll(page, limit);
      res.json({ data: result.data, total: result.total, page, limit });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const item = await this.service.findById(req.params.id);
      res.json({ data: item });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const data = updatePortfolioSchema.parse(req.body);
      const image = req.file;
      const item = await this.service.update(req.params.id, { ...data, image });
      res.json({ data: item });
    } catch (error: any) {
      if (req.file) await removeTempFile(req.file.path);
      res.status(400).json({ error: error.message });
    }
  };

  delete = async (req: AuthRequest, res: Response) => {
    try {
      await this.service.delete(req.params.id);
      res.json({ message: 'Portfolio item deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
