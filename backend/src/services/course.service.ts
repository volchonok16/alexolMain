import { CourseRepository } from '../repositories/course.repository.js';
import { uploadVideoToMinio, deleteVideoFromMinio, removeTempFile } from '../utils/minioStorage.js';

type PublicCourse = {
  id: string;
  title: string;
  topic: string;
  description: string;
  videoUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

const toPublicCourse = (course: {
  id: string;
  title: string;
  topic: string;
  description: string;
  videoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}): PublicCourse => ({
  id: course.id,
  title: course.title,
  topic: course.topic,
  description: course.description,
  videoUrl: course.videoUrl,
  createdAt: course.createdAt,
  updatedAt: course.updatedAt,
});

export class CourseService {
  private courseRepo = new CourseRepository();

  async create(data: { title: string; topic: string; description: string; video: Express.Multer.File }) {
    const uploaded = await uploadVideoToMinio(data.video);
    try {
      const course = await this.courseRepo.create({
        title: data.title,
        topic: data.topic,
        description: data.description,
        videoUrl: uploaded.videoUrl,
        videoKey: uploaded.videoKey,
      });
      return toPublicCourse(course);
    } catch (error) {
      await deleteVideoFromMinio(uploaded.videoKey);
      throw error;
    }
  }

  async findAll(page: number, limit: number) {
    return this.courseRepo.findAll(page, limit);
  }

  async findById(id: string) {
    const course = await this.courseRepo.findById(id);
    if (!course) throw new Error('Course not found');
    return toPublicCourse(course);
  }

  async update(
    id: string,
    data: { title?: string; topic?: string; description?: string; video?: Express.Multer.File }
  ) {
    const course = await this.courseRepo.findById(id);
    if (!course) {
      if (data.video) await removeTempFile(data.video.path);
      throw new Error('Course not found');
    }

    let videoUrl = course.videoUrl;
    let videoKey = course.videoKey;

    if (data.video) {
      const uploaded = await uploadVideoToMinio(data.video);
      await deleteVideoFromMinio(course.videoKey);
      videoUrl = uploaded.videoUrl;
      videoKey = uploaded.videoKey;
    }

    return this.courseRepo.update(id, {
      title: data.title,
      topic: data.topic,
      description: data.description,
      videoUrl,
      videoKey,
    });
  }

  async delete(id: string) {
    const course = await this.courseRepo.findById(id);
    if (!course) throw new Error('Course not found');

    await deleteVideoFromMinio(course.videoKey);
    return this.courseRepo.delete(id);
  }
}
