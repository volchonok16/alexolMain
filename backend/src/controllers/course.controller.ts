import { Response } from 'express';
import { CourseService } from '../services/course.service.js';
import { AuthRequest } from '../types/index.js';
import { createCourseSchema, updateCourseSchema } from '../validators/course.validator.js';
import { removeTempFile } from '../utils/minioStorage.js';

export class CourseController {
  private service = new CourseService();

  create = async (req: AuthRequest, res: Response) => {
    try {
      const data = createCourseSchema.parse(req.body);
      const video = req.file;
      if (!video) return res.status(400).json({ error: 'Video is required' });

      const course = await this.service.create({ ...data, video });
      res.status(201).json({ data: course });
    } catch (error: any) {
      if (req.file) await removeTempFile(req.file.path);
      res.status(400).json({ error: error.message });
    }
  };

  getAll = async (req: AuthRequest, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
      const result = await this.service.findAll(page, limit);
      res.json({ data: result.data, total: result.total, page, limit });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getById = async (req: AuthRequest, res: Response) => {
    try {
      const course = await this.service.findById(req.params.id);
      res.json({ data: course });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  update = async (req: AuthRequest, res: Response) => {
    try {
      const data = updateCourseSchema.parse(req.body);
      const video = req.file;
      const course = await this.service.update(req.params.id, { ...data, video });
      res.json({ data: course });
    } catch (error: any) {
      if (req.file) await removeTempFile(req.file.path);
      res.status(400).json({ error: error.message });
    }
  };

  delete = async (req: AuthRequest, res: Response) => {
    try {
      await this.service.delete(req.params.id);
      res.json({ message: 'Course deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
