import { normalizeJid, saveSudoList, MESSAGES } from '../france/index.js';

export const commands = [
  {
    name: 'sudo',
    description: 'Add, remove, or list users with sudo access.',
    category: 'Owner',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg, args }) => {
      const commandType = args[0]?.toLowerCase();

      if (commandType === 'list') {
        const list = [...global.ALLOWED_USERS];
        if (list.length === 0) {
          return sock.sendMessage(from, {
            text: MESSAGES.sudo.listEmpty
          }, { quoted: msg });
        }

        const text = MESSAGES.sudo.listHeader + list.map((n, i) => `${i + 1}. +${n}`).join('\n');
        return sock.sendMessage(from, { text }, { quoted: msg });
      }

      const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant ||
                     msg.message?.extendedTextMessage?.contextInfo?.remoteJid;

      if (!quoted) {
        return sock.sendMessage(from, {
          text: MESSAGES.sudo.noReply
        }, { quoted: msg });
      }

      const jid = normalizeJid(quoted);
      const number = jid.split('@')[0];

      if (commandType === 'add') {
        global.ALLOWED_USERS.add(number);
        saveSudoList(global.ALLOWED_USERS);
        return sock.sendMessage(from, {
          text: MESSAGES.sudo.added.replace('{number}', number)
        }, { quoted: msg });
      } else if (commandType === 'del') {
        global.ALLOWED_USERS.delete(number);
        saveSudoList(global.ALLOWED_USERS);
        return sock.sendMessage(from, {
          text: MESSAGES.sudo.removed.replace('{number}', number)
        }, { quoted: msg });
      } else {
        return sock.sendMessage(from, {
          text: MESSAGES.sudo.invalid
        }, { quoted: msg });
      }
    }
  }
];
