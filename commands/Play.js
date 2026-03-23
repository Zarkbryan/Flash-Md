import yts from 'yt-search';
import { getYouTubeMP3, MESSAGES } from '../france/index.js';

export const commands = [
  {
    name: 'play',
    aliases: ['music', 'ytmp3', 'song'],
    description: 'Search and download MP3 audio from YouTube (audio only).',
    category: 'Search',
    execute: async ({ sock, from, text, msg, config }) => {
      const botName = config.BOT_NAME || 'Flash-MD';
      const botVersion = config.BOT_VERSION || '3.0.0';

      if (!text) {
        return sock.sendMessage(from, { 
          text: MESSAGES.play.noQuery.replace('{botName}', botName).replace('{botVersion}', botVersion) 
        }, { quoted: msg });
      }

      try {
        const search = await yts(text);
        const video = search.videos?.[0];

        if (!video) {
          return sock.sendMessage(from, { 
            text: MESSAGES.play.noResults.replace('{botName}', botName).replace('{botVersion}', botVersion) 
          }, { quoted: msg });
        }

        const { error, downloadLink } = await getYouTubeMP3(video.videoId);

        if (error || !downloadLink) {
          return sock.sendMessage(from, { 
            text: MESSAGES.play.downloadError.replace('{error}', error || 'Failed to retrieve download link.') 
          }, { quoted: msg });
        }

        const safeTitle = video.title.replace(/[\\/:*?"<>|]/g, '');
        const fileName = `${safeTitle}.mp3`;

        const infoText = MESSAGES.play.info
          .replace('{botName}', botName.toUpperCase())
          .replace('{botVersion}', botVersion)
          .replace('{title}', video.title)
          .replace('{duration}', video.timestamp)
          .replace('{views}', video.views.toLocaleString())
          .replace('{ago}', video.ago)
          .replace('{author}', video.author.name)
          .replace('{videoId}', video.videoId);

        await sock.sendMessage(from, {
          image: { url: video.thumbnail },
          caption: infoText,
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

        await sock.sendMessage(from, {
          audio: { url: downloadLink },
          mimetype: 'audio/mpeg',
          fileName
        }, { quoted: msg });

      } catch (err) {
        sock.sendMessage(from, { 
          text: MESSAGES.play.error.replace('{botName}', botName).replace('{botVersion}', botVersion) 
        }, { quoted: msg });
      }
    }
  }
];
