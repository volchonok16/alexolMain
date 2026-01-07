import { Request, Response } from 'express';
import { ContactService } from '../services/contact.service.js';
import { contactSchema } from '../validators/contact.validator.js';

export class ContactController {
  private service = new ContactService();

  send = async (req: Request, res: Response) => {
    try {
      const data = contactSchema.parse(req.body);
      await this.service.sendToTelegram(data);
      res.json({ success: true, message: 'Message sent successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
}
