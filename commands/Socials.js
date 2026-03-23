import { googleSearch, getGithubUser, MESSAGES } from '../france/index.js';

export const commands = [
  {
    name: 'google',
    aliases: ['Search'],
    description: 'Search Google and get top results.',
    category: 'Search',
    execute: async ({ sock, from, text, msg, config }) => {
      const botName = config.BOT_NAME || 'Flash-MD';
      
      if (!text) {
        return sock.sendMessage(from, {
          text: MESSAGES.google.noQuery
        }, { quoted: msg });
      }
      
      try {
        const results = await googleSearch(text);
        
        if (!results || results.length === 0) {
          return sock.sendMessage(from, {
            text: MESSAGES.google.noResults
          }, { quoted: msg });
        }
        
        let resultsText = MESSAGES.google.header.replace('{query}', text);
        
        results.slice(0, 5).forEach(item => {
          resultsText += MESSAGES.google.item
            .replace('{title}', item.title)
            .replace('{snippet}', item.snippet)
            .replace('{link}', item.link);
        });
        
        await sock.sendMessage(from, {
          text: resultsText.trim(),
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
          text: MESSAGES.google.error
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'github',
    aliases: ['gh'],
    description: 'Fetch GitHub user profile info.',
    category: 'Search',
    execute: async ({ sock, from, text, msg, config }) => {
      const botName = config.BOT_NAME || 'Flash-MD';
      const args = text.trim().split(/\s+/);
      const username = args[0];
      
      if (!username) {
        return sock.sendMessage(from, {
          text: MESSAGES.github.noUsername
        }, { quoted: msg });
      }
      
      try {
        const data = await getGithubUser(username);
        
        if (data.message === 'Not Found') {
          return sock.sendMessage(from, {
            text: MESSAGES.github.notFound
          }, { quoted: msg });
        }
        
        const profilePic = `https://github.com/${data.login}.png`;
        
        const userInfo = MESSAGES.github.info
          .replace('{name}', data.name || 'N/A')
          .replace('{login}', data.login)
          .replace('{bio}', data.bio || 'N/A')
          .replace('{company}', data.company || 'N/A')
          .replace('{location}', data.location || 'N/A')
          .replace('{email}', data.email || 'N/A')
          .replace('{blog}', data.blog || 'N/A')
          .replace('{repos}', data.public_repos)
          .replace('{followers}', data.followers)
          .replace('{following}', data.following);
        
        await sock.sendMessage(from, {
          image: { url: profilePic },
          caption: userInfo,
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
          text: MESSAGES.github.error
        }, { quoted: msg });
      }
    }
  }
];
