import { config } from '../config/env.js';
import { LeadRepository } from '../repositories/lead.repository.js';

interface ContactData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  budget?: string;
  description: string;
  pageCount?: number;
  calculatedPrice?: number;
  source?: string;
}

export class ContactService {
  private botToken = config.telegramBotToken;
  private chatId = config.telegramChatId;
  private leadRepository = new LeadRepository();

  async submit(data: ContactData) {
    const lead = await this.leadRepository.create({
      ...data,
      source: data.source || 'contact_form',
    });

    try {
      await this.sendToTelegram(data);
    } catch (error) {
      console.error('[Contact] Telegram delivery failed, lead saved to DB', error);
    }

    return { success: true, id: lead.id };
  }

  private async sendToTelegram(data: ContactData) {
    const message = this.formatMessage(data);

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const responseText = await response.text();
    let responseJson: any;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = null;
    }

    if (!response.ok) {
      console.error('[Telegram] Failed to send message', {
        status: response.status,
        statusText: response.statusText,
        body: responseJson || responseText,
      });

      const description =
        responseJson && typeof responseJson.description === 'string'
          ? responseJson.description
          : undefined;

      throw new Error(
        description ? `Telegram error: ${description}` : 'Failed to send message to Telegram'
      );
    }

    return { success: true };
  }

  private formatMessage(data: ContactData): string {
    let message = '<b>🔔 Новая заявка с сайта</b>\n\n';
    message += `<b>Имя:</b> ${data.name}\n`;
    if (data.company) message += `<b>Компания:</b> ${data.company}\n`;
    message += `<b>Email:</b> ${data.email}\n`;
    if (data.phone) message += `<b>Телефон:</b> ${data.phone}\n`;
    if (data.budget) message += `<b>Бюджет:</b> ${data.budget}\n`;
    if (data.pageCount) message += `<b>Количество страниц:</b> ${data.pageCount}\n`;
    if (data.calculatedPrice) message += `<b>Расчетная цена:</b> ${data.calculatedPrice} ₽\n`;
    if (data.source) message += `<b>Источник:</b> ${data.source}\n`;
    message += `\n<b>Описание:</b>\n${data.description}`;

    return message;
  }
}
