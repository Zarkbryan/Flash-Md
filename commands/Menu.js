import os from 'os';
import moment from 'moment-timezone';
import axios from 'axios';
import { 
  applyStyle, 
  formatUptime, 
  detectPlatform, 
  fetchRepoStats,
  formatMenuHeader,
  formatMenuCategory,
  formatHelpHeader,
  formatHelpCategory,
  MESSAGES 
} from '../france/index.js';

const startTime = Date.now();

export const commands = [
  {
    name: 'menu',
    aliases: ['list'],
    description: 'Show all available bot commands.',
    category: 'General',
    execute: async ({ sock, from, msg, commands, config }) => {
      try {
        const botName = config.BOT_NAME || 'Flash-MD';
        const botVersion = config.BOT_VERSION || '3.0.0';
        const ownerName = config.OWNER_NAME || 'FLASH-MD';
        const tz = config.TZ || 'Africa/Nairobi';
        
        const list = Array.from(commands.values());
        if (!list.length) {
          return sock.sendMessage(from, { text: MESSAGES.menu.noCommands }, { quoted: msg });
        }
        
        const time = moment().tz(tz);
        const uptime = formatUptime(Date.now() - startTime);
        const platform = detectPlatform();
        const usedMem = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2);
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const { forks, stars } = await fetchRepoStats();
        const users = (stars * 3) + (forks * 2);
        const usersFormatted = users.toLocaleString();
        const prefix = config.PREFIXES?.[0] || ' ';
        
        const grouped = {};
        for (const cmd of list) {
          const category = cmd.category || 'General';
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push(cmd);
        }
        
        let menuText = formatMenuHeader(botName, botVersion);
        menuText += MESSAGES.menu.stats
          .replace('{totalCommands}', list.length.toLocaleString())
          .replace('{prefix}', prefix)
          .replace('{time}', time.format('HH:mm:ss'))
          .replace('{tz}', tz)
          .replace('{date}', time.format('DD/MM/YYYY'))
          .replace('{uptime}', uptime)
          .replace('{platform}', platform)
          .replace('{usedMem}', usedMem)
          .replace('{totalMem}', totalMem)
          .replace('{users}', usersFormatted)
          .replace('{owner}', ownerName);
        menuText += MESSAGES.menu.footer.replace('{version}', botVersion);
        
        let counter = 1;
        const sortedCategories = Object.keys(grouped).sort();
        for (const category of sortedCategories) {
          const commandsInCategory = grouped[category]
            .filter(c => c.name)
            .sort((a, b) => a.name.localeCompare(b.name));
          if (commandsInCategory.length === 0) continue;
          
          menuText += formatMenuCategory(category);
          for (const cmd of commandsInCategory) {
            menuText += MESSAGES.menu.commandItem
              .replace('{counter}', counter++)
              .replace('{name}', cmd.name);
          }
          menuText += MESSAGES.menu.categoryEnd;
        }
        
        await sock.sendMessage(from, { 
          text: menuText,
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
        console.error('Menu error:', error);
        await sock.sendMessage(from, { text: MESSAGES.menu.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'help',
    aliases: ['guide'],
    description: 'Show command details with descriptions and aliases.',
    category: 'General',
    execute: async ({ sock, from, text, msg, commands, config }) => {
      try {
        const botName = config.BOT_NAME || 'Flash-MD';
        const botVersion = config.BOT_VERSION || '3.0.0';
        
        const list = Array.from(commands.values());
        if (!list.length) {
          return sock.sendMessage(from, { text: MESSAGES.help.noCommands }, { quoted: msg });
        }
        
        const prefix = config.PREFIXES?.[0] || ' ';
        
        let helpText = formatHelpHeader(botName, botVersion);
        helpText += MESSAGES.help.info
          .replace('{prefix}', prefix)
          .replace('{botName}', botName)
          .replace('{botVersion}', botVersion);
        
        const grouped = {};
        for (const cmd of list) {
          const category = cmd.category || 'General';
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push(cmd);
        }
        
        const sortedCategories = Object.keys(grouped).sort();
        for (const category of sortedCategories) {
          const commandsInCategory = grouped[category]
            .filter(c => c.name)
            .sort((a, b) => a.name.localeCompare(b.name));
          if (commandsInCategory.length === 0) continue;
          
          helpText += formatHelpCategory(category);
          for (const cmd of commandsInCategory) {
            helpText += MESSAGES.help.commandName
              .replace('{name}', cmd.name);
            helpText += MESSAGES.help.description
              .replace('{desc}', cmd.description || 'No description');
            if (cmd.aliases && cmd.aliases.length > 0) {
              helpText += MESSAGES.help.aliases
                .replace('{aliases}', cmd.aliases.join(', '));
            }
            helpText += MESSAGES.help.commandSeparator;
          }
          helpText += MESSAGES.help.categoryEnd;
        }
        
        helpText += MESSAGES.help.footer
          .replace('{prefix}', prefix)
          .replace('{botName}', botName)
          .replace('{botVersion}', botVersion);
        
        await sock.sendMessage(from, { 
          text: helpText,
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
        console.error('Help error:', error);
        await sock.sendMessage(from, { text: MESSAGES.help.error }, { quoted: msg });
      }
    }
  }
];
