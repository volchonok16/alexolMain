import { NewsRepository } from '../repositories/news.repository.js';
import { saveFile, deleteFile } from '../utils/fileUpload.js';

export class NewsService {
  private newsRepo = new NewsRepository();

  async create(data: { title: string; text: string; photo: Express.Multer.File }) {
    const photoUrl = await saveFile(data.photo);
    return this.newsRepo.create({ title: data.title, text: data.text, photo: photoUrl });
  }

  async findAll() {
    return this.newsRepo.findAll();
  }

  async findById(id: string) {
    const news = await this.newsRepo.findById(id);
    if (!news) throw new Error('News not found');
    return news;
  }

  async update(id: string, data: { title?: string; text?: string; photo?: Express.Multer.File }) {
    const news = await this.newsRepo.findById(id);
    if (!news) throw new Error('News not found');

    let photoUrl = news.photo;
    if (data.photo) {
      await deleteFile(news.photo);
      photoUrl = await saveFile(data.photo);
    }

    return this.newsRepo.update(id, { title: data.title, text: data.text, photo: photoUrl });
  }

  async delete(id: string) {
    const news = await this.newsRepo.findById(id);
    if (!news) throw new Error('News not found');
    
    await deleteFile(news.photo);
    return this.newsRepo.delete(id);
  }
}
