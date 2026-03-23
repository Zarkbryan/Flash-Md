import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { geminiVision2, MESSAGES } from '../france/index.js';

export const commands = [
  {
    name: 'vision',
    aliases: ['describe', 'analyze'],
    description: 'Analyze a replied image using Gemini Vision 2.',
    category: 'AI',
    execute: async ({ sock, from, msg, args, config }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const botName = config.BOT_NAME || 'Flash-MD';

      if (!quoted || !quoted.imageMessage) {
        return sock.sendMessage(from, {
          text: MESSAGES.vision.noImage
        }, { quoted: msg });
      }

      const query = args.join(' ');
      if (!query) {
        return sock.sendMessage(from, {
          text: MESSAGES.vision.noQuery
        }, { quoted: msg });
      }

      try {
        const buffer = await downloadMediaMessage(
          { message: { imageMessage: quoted.imageMessage } },
          'buffer',
          {},
          { logger: console }
        );

        const base64Image = buffer.toString('base64');
        const result = await geminiVision2(base64Image, query);

        await sock.sendMessage(from, {
          text: MESSAGES.vision.success.replace('{result}', result),
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: botName,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });

      } catch (err) {
        await sock.sendMessage(from, {
          text: MESSAGES.vision.error.replace('{error}', err.message)
        }, { quoted: msg });
      }
    }
  }
];
