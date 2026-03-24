import axios from 'axios';
import { API_CONFIG, MESSAGES } from '../france/index.js';

export const commands = [
  {
    name: 'twitter',
    aliases: ['tw', 'x', 'twdl', 'xdl'],
    description: 'Download videos from Twitter/X using Nayan API.',
    category: 'Download',
    execute: async ({ sock, from, text, msg, config }) => {
      if (!text) {
        return sock.sendMessage(from, { 
          text: MESSAGES.twitter.noUrl
        }, { quoted: msg });
      }

      const twitterRegex = /(twitter\.com|x\.com)\/\w+\/status\/\d+/i;
      if (!twitterRegex.test(text)) {
        return sock.sendMessage(from, { 
          text: MESSAGES.twitter.invalidUrl
        }, { quoted: msg });
      }

      try {
        await sock.sendMessage(from, { 
          text: MESSAGES.twitter.fetching
        }, { quoted: msg });

        const apiUrl = `${API_CONFIG.nayanApi.twitter}?url=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl, { timeout: API_CONFIG.nayanApi.timeout });

        if (!response.data?.status || !response.data?.data) {
          throw new Error('Failed to fetch video');
        }

        const { thumbnail, HD, SD } = response.data.data;
        const videoUrl = HD || SD;
        
        if (!videoUrl) {
          return sock.sendMessage(from, { 
            text: MESSAGES.twitter.noVideo
          }, { quoted: msg });
        }

        const quality = HD ? 'HD' : 'SD';
        const caption = MESSAGES.twitter.caption.replace('{quality}', quality);

        await sock.sendMessage(from, {
          video: { url: videoUrl },
          caption: caption,
          thumbnail: thumbnail ? { url: thumbnail } : null,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: config.BOT_NAME || 'Flash-MD',
              serverMessageId: -1
            }
          }
        }, { quoted: msg });

      } catch (error) {
        console.error('Twitter download error:', error);
        
        let errorMessage = MESSAGES.twitter.error;
        
        if (error.code === 'ECONNABORTED') {
          errorMessage = MESSAGES.twitter.timeout;
        } else if (error.response?.status === 404) {
          errorMessage = MESSAGES.twitter.notFound;
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = MESSAGES.twitter.apiError;
        }
        
        return sock.sendMessage(from, { 
          text: errorMessage
        }, { quoted: msg });
      }
    }
  }
];
