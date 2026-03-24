import axios from 'axios';
import { API_CONFIG, MESSAGES } from '../france/index.js';
import yts from 'yt-search';

export const commands = [
  {
    name: 'playlist',
    aliases: ['list', 'pl', 'ytlist'],
    description: 'Fetch and display videos from a YouTube playlist or search by keywords.',
    category: 'Search',
    execute: async ({ sock, from, text, msg, config }) => {
      if (!text) {
        return sock.sendMessage(from, { 
          text: MESSAGES.playlist.noQuery
        }, { quoted: msg });
      }

      try {
        await sock.sendMessage(from, { 
          text: MESSAGES.playlist.fetching
        }, { quoted: msg });

        let playlistUrl = text;
        const youtubeRegex = /(youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/playlist\?list=)([a-zA-Z0-9_-]+)/i;
        
        if (!youtubeRegex.test(text)) {
          const search = await yts(text);
          const video = search.videos?.[0];
          
          if (!video) {
            return sock.sendMessage(from, { 
              text: MESSAGES.playlist.noResults
            }, { quoted: msg });
          }
          
          playlistUrl = video.url;
        }
        
        const apiUrl = `${API_CONFIG.nayanApi.playlist}?url=${encodeURIComponent(playlistUrl)}`;
        const response = await axios.get(apiUrl, { timeout: API_CONFIG.nayanApi.timeout });

        if (!response.data?.status || !response.data?.videos) {
          throw new Error('Failed to fetch playlist');
        }

        const { title, total, videos } = response.data;
        const botName = config.BOT_NAME || 'FLASH-MD V3';

        let playlistText = `🎵 *${botName} PLAYLIST*\n\n`;
        playlistText += `📋 *${title || 'MIX'}*\n`;
        playlistText += `📊 *Total Videos:* ${total}\n\n`;

        const limitedVideos = videos.slice(0, 10);
        
        limitedVideos.forEach((video, index) => {
          playlistText += `${index + 1}. *${video.title}*\n`;
          playlistText += `   ⏱️ Duration: ${video.duration}\n`;
          playlistText += `   🔗 ${video.url}\n\n`;
        });

        if (total > 10) {
          playlistText += `_...and ${total - 10} more videos_\n`;
        }

        playlistText += `\n_✨ Use .play <video title> to download any song_`;
        playlistText += `\n\n⚡ *Powered by ${botName}*`;

        const thumbnail = limitedVideos[0]?.thumbnail;

        await sock.sendMessage(from, {
          image: { url: thumbnail },
          caption: playlistText,
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

      } catch (error) {
        console.error('Playlist error:', error);
        
        let errorMessage = MESSAGES.playlist.error;
        
        if (error.code === 'ECONNABORTED') {
          errorMessage = MESSAGES.playlist.timeout;
        } else if (error.response?.status === 404) {
          errorMessage = MESSAGES.playlist.notFound;
        }
        
        return sock.sendMessage(from, { 
          text: errorMessage
        }, { quoted: msg });
      }
    }
  }
];
