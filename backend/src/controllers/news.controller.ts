import { Response } from 'express';
import { NewsService } from '../services/news.service.js';
import { AuthRequest } from '../types/index.js';
import { createNewsSchema, updateNewsSchema } from '../validators/news.validator.js';

export class NewsController {
  private service = new NewsService();

  create = async (req: AuthRequest, res: Response) => {
    try {
      const data = createNewsSchema.parse(req.body);
      const photo = req.file;
      if (!photo) return res.status(400).json({ error: 'Photo is required' });
      
      const news = await this.service.create({ ...data, photo });
      res.status(201).json({ data: news });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const news = await this.service.findAll();
      res.json({ data: news });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const news = await this.service.findById(req.params.id);
      res.json({ data: news });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const data = updateNewsSchema.parse(req.body);
      const photo = req.file;
      const news = await this.service.update(req.params.id, { ...data, photo });
      res.json({ data: news });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  delete = async (req: AuthRequest, res: Response) => {
    try {
      await this.service.delete(req.params.id);
      res.json({ message: 'News deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
