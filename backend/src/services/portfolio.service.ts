import { PortfolioRepository } from '../repositories/portfolio.repository.js';
import { uploadFileToMinio, deleteObjectFromMinio, removeTempFile } from '../utils/minioStorage.js';

type PortfolioInput = {
  category: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  resultRu: string;
  resultEn: string;
  link?: string | null;
  sortOrder?: number;
};

export class PortfolioService {
  private portfolioRepo = new PortfolioRepository();

  async create(data: PortfolioInput & { image: Express.Multer.File }) {
    const uploaded = await uploadFileToMinio(data.image, 'portfolio');
    try {
      const sortOrder = data.sortOrder ?? (await this.portfolioRepo.getMaxSortOrder()) + 1;
      return await this.portfolioRepo.create({
        category: data.category,
        titleRu: data.titleRu,
        titleEn: data.titleEn,
        descriptionRu: data.descriptionRu,
        descriptionEn: data.descriptionEn,
        resultRu: data.resultRu,
        resultEn: data.resultEn,
        link: data.link,
        imageUrl: uploaded.url,
        imageKey: uploaded.key,
        sortOrder,
      });
    } catch (error) {
      await deleteObjectFromMinio(uploaded.key);
      throw error;
    }
  }

  async findAll(page: number, limit: number) {
    return this.portfolioRepo.findAll(page, limit);
  }

  async findById(id: string) {
    const item = await this.portfolioRepo.findById(id);
    if (!item) throw new Error('Portfolio item not found');
    const { imageKey: _imageKey, ...publicItem } = item;
    return publicItem;
  }

  async update(id: string, data: Partial<PortfolioInput> & { image?: Express.Multer.File }) {
    const item = await this.portfolioRepo.findById(id);
    if (!item) {
      if (data.image) await removeTempFile(data.image.path);
      throw new Error('Portfolio item not found');
    }

    let imageUrl = item.imageUrl;
    let imageKey = item.imageKey;

    if (data.image) {
      const uploaded = await uploadFileToMinio(data.image, 'portfolio');
      await deleteObjectFromMinio(item.imageKey);
      imageUrl = uploaded.url;
      imageKey = uploaded.key;
    }

    return this.portfolioRepo.update(id, {
      category: data.category,
      titleRu: data.titleRu,
      titleEn: data.titleEn,
      descriptionRu: data.descriptionRu,
      descriptionEn: data.descriptionEn,
      resultRu: data.resultRu,
      resultEn: data.resultEn,
      link: data.link,
      sortOrder: data.sortOrder,
      imageUrl,
      imageKey,
    });
  }

  async delete(id: string) {
    const item = await this.portfolioRepo.findById(id);
    if (!item) throw new Error('Portfolio item not found');

    await deleteObjectFromMinio(item.imageKey);
    return this.portfolioRepo.delete(id);
  }
}
