import { fetchRepoStats, MESSAGES } from '../france/index.js';

export const commands = [
  {
    name: 'repo',
    aliases: ['sc', 'script'],
    description: 'Sends the official GitHub repository and stats for FLASH-MD',
    execute: async ({ sock, from, config }) => {
      const botName = config.BOT_NAME || 'Flash-MD';
      const botVersion = config.BOT_VERSION || '3.0.0';
      const repoUrl = 'https://github.com/franceking1/Flash-Md-V3';

      try {
        const { stars, forks, watchers, created, lastUpdated } = await fetchRepoStats();

        const repoInfo = MESSAGES.repo.info
          .replace('{botName}', botName.toUpperCase())
          .replace('{botVersion}', botVersion)
          .replace('{repoUrl}', repoUrl)
          .replace('{stars}', stars.toLocaleString())
          .replace('{forks}', forks.toLocaleString())
          .replace('{watchers}', watchers.toLocaleString())
          .replace('{created}', created)
          .replace('{lastUpdated}', lastUpdated)
          .replace('{botNameLower}', botName)
          .replace('{botVersionLower}', botVersion);

        await sock.sendMessage(from, { text: repoInfo });

      } catch (error) {
        console.error('GitHub Repo Error:', error.message);
        await sock.sendMessage(from, {
          text: MESSAGES.repo.error.replace('{botName}', botName).replace('{botVersion}', botVersion)
        });
      }
    }
  }
];
