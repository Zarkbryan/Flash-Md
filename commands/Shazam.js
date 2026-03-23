import yts from 'yt-search';
import fs from 'fs';
import path from 'path';
import { downloadContentFromMessage, identifySong, MESSAGES } from '../france/index.js';

const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

async function getBuffer(message, type) {
  const stream = await downloadContentFromMessage(message, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export const commands = [
  {
    name: 'shazam',
    aliases: ['whatsong', 'findsong', 'identify'],
    description: 'Identify a song from an audio or video clip.',
    category: 'Search',
    execute: async ({ sock, from, text, msg, config }) => {
      const botName = config.BOT_NAME || 'Flash-MD';
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!quoted || (!quoted.audioMessage && !quoted.videoMessage)) {
        return sock.sendMessage(from, {
          text: MESSAGES.shazam.noReply
        }, { quoted: msg });
      }
      
      try {
        let buffer;
        if (quoted.audioMessage) {
          buffer = await getBuffer(quoted.audioMessage, 'audio');
        } else {
          buffer = await getBuffer(quoted.videoMessage, 'video');
        }
        
        const MAX_SIZE = 1 * 1024 * 1024;
        if (buffer.length > MAX_SIZE) buffer = buffer.slice(0, MAX_SIZE);
        
        const matchedSong = await identifySong(buffer);
        
        if (!matchedSong) {
          return sock.sendMessage(from, {
            text: MESSAGES.shazam.notRecognized
          }, { quoted: msg });
        }
        
        const { title, artists, album, genres, release_date } = matchedSong;
        const ytQuery = `${title} ${artists?.[0]?.name || ''}`;
        const ytSearch = await yts(ytQuery);
        
        let response = MESSAGES.shazam.header;
        response += MESSAGES.shazam.title.replace('{title}', title || 'Unknown');
        
        if (artists) {
          response += MESSAGES.shazam.artists.replace('{artists}', artists.map(a => a.name).join(', '));
        }
        if (album?.name) {
          response += MESSAGES.shazam.album.replace('{album}', album.name);
        }
        if (genres?.length) {
          response += MESSAGES.shazam.genres.replace('{genres}', genres.map(g => g.name).join(', '));
        }
        if (release_date) {
          const [year, month, day] = release_date.split('-');
          response += MESSAGES.shazam.release.replace('{day}', day).replace('{month}', month).replace('{year}', year);
        }
        if (ytSearch?.videos?.[0]?.url) {
          response += MESSAGES.shazam.youtube.replace('{url}', ytSearch.videos[0].url);
        }
        
        response += MESSAGES.shazam.footer.replace('{botName}', botName);
        
        return sock.sendMessage(from, {
          text: response.trim(),
          contextInfo: {
            forwardingScore: 777,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: '120363238139244263@newsletter',
              newsletterName: botName,
              serverMessageId: -1
            }
          }
        }, { quoted: msg });
      } catch (err) {
        console.error('Shazam error:', err);
        return sock.sendMessage(from, {
          text: MESSAGES.shazam.error
        }, { quoted: msg });
      }
    }
  }
];
