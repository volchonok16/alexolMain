interface TelegramMessage {
    name: string;
    phone: string;
    email: string;
    message: string;
}

const TELEGRAM_BOT_TOKEN = '7204000939:AAExDWOrlHqh_ULELFLLTvKu7-1lpzS0fGs';
const TELEGRAM_CHAT_ID = '-1002340809995';
const TELEGRAM_TOPIC_ID = '9454';

export const sendTelegramMessage = async (formData: TelegramMessage): Promise<boolean> => {
    try {
        const messageText = `
🆕 Новая заявка с сайта

👤 Имя: ${formData.name}
📞 Телефон: ${formData.phone}
📧 Email: ${formData.email}
💬 Сообщение: ${formData.message || 'Не указано'}

⏰ Время: ${new Date().toLocaleString('ru-RU')}
        `.trim();

        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                message_thread_id: TELEGRAM_TOPIC_ID,
                text: messageText,
                parse_mode: 'HTML',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Telegram API error:', errorData);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        return false;
    }
}; 