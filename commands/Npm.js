import { npmSearch, formatDate, MESSAGES } from '../france/index.js';

export const commands = [
  {
    name: 'npm',
    aliases: [],
    description: 'Search for an NPM package and view its details.',
    category: 'General',
    execute: async ({ sock, from, text, msg, config }) => {
      const botName = config.BOT_NAME || 'Flash-MD';
      const botVersion = config.BOT_VERSION || '3.0.0';
      
      if (!text) {
        return sock.sendMessage(from, { 
          text: MESSAGES.npm.noQuery 
        }, { quoted: msg });
      }
      
      try {
        const data = await npmSearch(text);
        
        if (!data.results?.length) {
          return sock.sendMessage(from, { 
            text: MESSAGES.npm.notFound.replace('{query}', text) 
          }, { quoted: msg });
        }
        
        const pkg = data.results[0];
        const formattedDate = formatDate(pkg.date);
        
        const result = MESSAGES.npm.result
          .replace('{name}', pkg.name)
          .replace('{version}', pkg.version)
          .replace('{description}', pkg.description || 'N/A')
          .replace('{publisher}', pkg.publisher.username)
          .replace('{license}', pkg.license || 'N/A')
          .replace('{date}', formattedDate)
          .replace('{npmLink}', pkg.links.npm)
          .replace('{repoLink}', pkg.links.repository || 'N/A')
          .replace('{homepage}', pkg.links.homepage || 'N/A')
          .replace('{botName}', botName)
          .replace('{botVersion}', botVersion);
        
        await sock.sendMessage(from, { 
          text: result,
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
        await sock.sendMessage(from, { 
          text: MESSAGES.npm.error 
        }, { quoted: msg });
      }
    }
  }
];
