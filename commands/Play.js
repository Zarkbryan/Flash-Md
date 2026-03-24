import axios from 'axios';
import { API_CONFIG, MESSAGES } from '../france/index.js';
import yts from 'yt-search';

export const commands = [
  {
    name: 'play',
    description: 'Search and download MP3 audio from YouTube using Nayan API.',
    category: 'Search',
    execute: async ({ sock, from, text, msg, config }) => {
      if (!text) {
        return sock.sendMessage(from, { 
          text: MESSAGES.play.noQuery
        }, { quoted: msg });
      }

      try {
        let videoUrl = text;
        
        const youtubeRegex = /(youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/i;
        if (!youtubeRegex.test(text)) {
          await sock.sendMessage(from, { 
            text: MESSAGES.play.fetching
          }, { quoted: msg });
          
          const search = await yts(text);
          const video = search.videos?.[0];
          
          if (!video) {
            return sock.sendMessage(from, { 
              text: MESSAGES.play.noResults
            }, { quoted: msg });
          }
          
          videoUrl = video.url;
        }
        
        const apiUrl = `${API_CONFIG.nayanApi.youtube}?url=${encodeURIComponent(videoUrl)}`;
        const response = await axios.get(apiUrl, { timeout: API_CONFIG.nayanApi.timeout });
        
        if (!response.data?.status || !response.data?.data) {
          throw new Error('Failed to fetch audio');
        }
        
        const { title, thumb, audio, quality, channel } = response.data.data;
        
        if (!audio) {
          return sock.sendMessage(from, { 
            text: MESSAGES.play.noAudio
          }, { quoted: msg });
        }
        
        const safeTitle = title.replace(/[\\/:*?"<>|]/g, '');
        const fileName = `${safeTitle}.mp3`;
        
        const infoText = MESSAGES.play.info
          .replace('{title}', title)
          .replace('{channel}', channel)
          .replace('{quality}', quality);
        
        await sock.sendMessage(from, {
          image: { url: thumb },
          caption: infoText,
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
        
        await sock.sendMessage(from, {
          audio: { url: audio },
          mimetype: 'audio/mpeg',
          fileName,
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
        console.error('Play error:', error);
        
        let errorMessage = MESSAGES.play.error;
        
        if (error.code === 'ECONNABORTED') {
          errorMessage = MESSAGES.play.timeout;
        }
        
        return sock.sendMessage(from, { 
          text: errorMessage
        }, { quoted: msg });
      }
    }
  }
];
