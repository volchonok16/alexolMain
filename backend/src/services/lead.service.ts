import { LeadRepository, type LeadCreateData, type LeadUpdateData } from '../repositories/lead.repository.js';

export class LeadService {
  private repository = new LeadRepository();

  create(data: LeadCreateData) {
    return this.repository.create(data);
  }

  findAll(page: number, limit: number) {
    return this.repository.findAll(page, limit);
  }

  async findById(id: string) {
    const lead = await this.repository.findById(id);
    if (!lead) throw new Error('Lead not found');
    return lead;
  }

  update(id: string, data: LeadUpdateData) {
    return this.repository.update(id, data);
  }

  delete(id: string) {
    return this.repository.delete(id);
  }
}
