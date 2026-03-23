import { getOnlineMembers } from '../france/Presence.js';
import { MESSAGES } from '../france/config.js';

export const commands = [
  {
    name: 'online',
    aliases: ['listonline', 'active'],
    description: 'List currently online group members.',
    category: 'Group',
    groupOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const online = await getOnlineMembers(sock, from);
        if (!online.length) {
          return sock.sendMessage(from, {
            text: MESSAGES.group.online.noMembers
          }, { quoted: msg });
        }
        const onlineList = online.map((jid, index) => `${index + 1}. 🟢 @${jid.split('@')[0]}`).join('\n');
        await sock.sendMessage(from, {
          text: MESSAGES.group.online.list.replace('{list}', onlineList),
          mentions: online
        }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(from, {
          text: MESSAGES.group.online.error.replace('{error}', err.message)
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'info',
    aliases: ['ginfo', 'ginf'],
    category: 'Group',
    groupOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const metadata = await sock.groupMetadata(from);
        const groupName = metadata.subject;
        const groupId = metadata.id;
        const participants = metadata.participants;
        const totalMembers = participants.length;
        const admins = participants.filter(p => p.admin);
        const ownerJid = metadata.owner || (admins.find(p => p.admin === 'superadmin')?.id);
        const ownerNumber = ownerJid ? ownerJid.split('@')[0] : 'Unknown';
        const adminList = admins.map((a, i) => `${i + 1}. @${a.id.split('@')[0]}`).join('\n');
        
        const response = MESSAGES.group.info.result
          .replace('{groupName}', groupName)
          .replace('{groupId}', groupId)
          .replace('{ownerNumber}', ownerNumber)
          .replace('{totalMembers}', totalMembers)
          .replace('{adminCount}', admins.length)
          .replace('{adminList}', adminList);
          
        await sock.sendMessage(from, {
          text: response,
          mentions: [...(ownerJid ? [ownerJid] : []), ...admins.map(a => a.id)]
        }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(from, { text: MESSAGES.group.info.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'antilink',
    description: 'Enable/disable antilink and set action (warn/kick/delete)',
    category: 'Group',
    adminOnly: true,
    botAdminOnly: true,
    ownerOnly: true,
    groupOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const args = text.trim().split(/\s+/);
      const [option, action = 'warn'] = args;
      if (!['on', 'off'].includes(option) || !['warn', 'kick', 'delete'].includes(action)) {
        return sock.sendMessage(from, {
          text: MESSAGES.group.antilink.usage
        }, { quoted: msg });
      }
      return sock.sendMessage(from, {
        text: MESSAGES.group.antilink.success.replace('{option}', option.toUpperCase()).replace('{action}', action.toUpperCase())
      }, { quoted: msg });
    }
  },
  {
    name: 'hidetag',
    aliases: ['tag'],
    description: 'Mentions all members in the group using a message or media.',
    category: 'Group',
    groupOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const metadata = await sock.groupMetadata(from);
      const tagList = metadata.participants.map(p => p.id);
      const quoted = msg.message?.extendedTextMessage?.contextInfo;
      let outMsg;
      
      if (quoted?.quotedMessage) {
        const quotedMsg = quoted.quotedMessage;
        const type = Object.keys(quotedMsg)[0];
        switch (type) {
          case 'imageMessage':
          case 'videoMessage':
          case 'audioMessage':
            outMsg = { text: MESSAGES.group.hidetag.default, mentions: tagList };
            break;
          case 'conversation':
          case 'extendedTextMessage':
            const textContent = quotedMsg?.conversation || quotedMsg.extendedTextMessage?.text || MESSAGES.group.hidetag.default;
            outMsg = { text: textContent, mentions: tagList };
            break;
          default:
            outMsg = { text: MESSAGES.group.hidetag.default, mentions: tagList };
        }
      } else {
        if (!text) {
          return sock.sendMessage(from, {
            text: MESSAGES.group.hidetag.noMessage
          }, { quoted: msg });
        }
        outMsg = { text: text, mentions: tagList };
      }
      await sock.sendMessage(from, outMsg);
    }
  },
  {
    name: 'tagall',
    aliases: ['mentionall'],
    description: 'Mentions all members of the current group.',
    category: 'Group',
    groupOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const groupInfo = await sock.groupMetadata(from);
        const participants = groupInfo.participants;
        if (!participants.length) {
          return await sock.sendMessage(from, { text: MESSAGES.group.tagall.noParticipants }, { quoted: msg });
        }
        const customText = text || MESSAGES.group.tagall.defaultText;
        let mentionText = MESSAGES.group.tagall.header.replace('{text}', customText);
        participants.forEach((p, i) => {
          mentionText += `${i + 1}. @${p.id.split('@')[0]}\n`;
        });
        await sock.sendMessage(from, {
          text: mentionText,
          mentions: participants.map(p => p.id)
        }, { quoted: msg });
      } catch (error) {
        await sock.sendMessage(from, {
          text: MESSAGES.group.tagall.error
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'rename',
    aliases: ['gname'],
    description: 'Change the group subject (name).',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    ownerOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const newSubject = text;
      if (!newSubject) {
        return sock.sendMessage(from, { text: MESSAGES.group.rename.noName }, { quoted: msg });
      }
      try {
        await sock.groupUpdateSubject(from, newSubject);
        await sock.sendMessage(from, { text: MESSAGES.group.rename.success.replace('{name}', newSubject) }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.rename.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'kick',
    aliases: ['remove'],
    description: 'Remove a user from the group.',
    category: 'Group',
    ownerOnly: true,
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const tagged = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const target = quoted || tagged;
      if (!target) {
        return sock.sendMessage(from, { text: MESSAGES.group.kick.noTarget }, { quoted: msg });
      }
      try {
        await sock.groupParticipantsUpdate(from, [target], 'remove');
        await sock.sendMessage(from, {
          text: MESSAGES.group.kick.success.replace('{user}', target.split('@')[0]),
          mentions: [target]
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.kick.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'add',
    aliases: [],
    description: 'Add a user to the group.',
    category: 'Group',
    ownerOnly: true,
    groupOnly: true,
    adminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const args = text.trim().split(/\s+/);
      if (!args[0]) {
        return sock.sendMessage(from, { text: MESSAGES.group.add.noNumber }, { quoted: msg });
      }
      const num = args[0].replace(/\D/g, '');
      const userJid = `${num}@s.whatsapp.net`;
      try {
        await sock.groupParticipantsUpdate(from, [userJid], 'add');
        await sock.sendMessage(from, { text: MESSAGES.group.add.success.replace('{number}', num) }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, {
          text: MESSAGES.group.add.error
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'kickall',
    aliases: [],
    description: 'Remove all non-admin members.',
    category: 'Group',
    ownerOnly: true,
    groupOnly: true,
    adminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const metadata = await sock.groupMetadata(from);
      const toKick = metadata.participants.filter(p => !p.admin).map(p => p.id);
      await sock.sendMessage(from, { text: MESSAGES.group.kickall.warning }, { quoted: msg });
      await new Promise(res => setTimeout(res, 5000));
      for (const id of toKick) {
        await sock.groupParticipantsUpdate(from, [id], 'remove');
        await new Promise(res => setTimeout(res, 500));
      }
    }
  },
  {
    name: 'promote',
    aliases: [],
    description: 'Promote a member to admin.',
    category: 'Group',
    ownerOnly: true,
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const tagged = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const target = quoted || tagged;
      if (!target) {
        return sock.sendMessage(from, { text: MESSAGES.group.promote.noTarget }, { quoted: msg });
      }
      try {
        await sock.groupParticipantsUpdate(from, [target], 'promote');
        await sock.sendMessage(from, {
          text: MESSAGES.group.promote.success.replace('{user}', target.split('@')[0]),
          mentions: [target]
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.promote.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'demote',
    aliases: [],
    description: 'Demote a group admin.',
    category: 'Group',
    ownerOnly: true,
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const tagged = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const target = quoted || tagged;
      if (!target) {
        return sock.sendMessage(from, { text: MESSAGES.group.demote.noTarget }, { quoted: msg });
      }
      try {
        await sock.groupParticipantsUpdate(from, [target], 'demote');
        await sock.sendMessage(from, {
          text: MESSAGES.group.demote.success.replace('{user}', target.split('@')[0]),
          mentions: [target]
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.demote.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'approve',
    aliases: ['approve-all', 'accept'],
    description: 'Approve all pending join requests.',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    ownerOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const requests = await sock.groupRequestParticipantsList(from);
        if (requests.length === 0) {
          return sock.sendMessage(from, { text: MESSAGES.group.approve.noRequests }, { quoted: msg });
        }
        for (const p of requests) {
          await sock.groupRequestParticipantsUpdate(from, [p.jid], 'approve');
        }
        await sock.sendMessage(from, { text: MESSAGES.group.approve.success }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.approve.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'reject',
    aliases: ['rejectall', 'rej', 'reject-all'],
    description: 'Reject all pending join requests.',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const requests = await sock.groupRequestParticipantsList(from);
        if (requests.length === 0) {
          return sock.sendMessage(from, { text: MESSAGES.group.reject.noRequests }, { quoted: msg });
        }
        for (const p of requests) {
          await sock.groupRequestParticipantsUpdate(from, [p.jid], 'reject');
        }
        await sock.sendMessage(from, { text: MESSAGES.group.reject.success }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.reject.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'req',
    description: 'List pending join requests.',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const requests = await sock.groupRequestParticipantsList(from);
        if (!requests.length) {
          return sock.sendMessage(from, { text: MESSAGES.group.req.noRequests }, { quoted: msg });
        }
        const list = requests.map(p => '+' + p.jid.split('@')[0]).join('\n');
        await sock.sendMessage(from, {
          text: MESSAGES.group.req.list.replace('{list}', list),
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.req.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'disap1',
    description: 'Set disappearing messages to 24 hours.',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        await sock.groupToggleEphemeral(from, 86400);
        await sock.sendMessage(from, { text: MESSAGES.group.disap.success24 }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.disap.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'disap7',
    description: 'Set disappearing messages to 7 days.',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        await sock.groupToggleEphemeral(from, 7 * 24 * 3600);
        await sock.sendMessage(from, { text: MESSAGES.group.disap.success7 }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.disap.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'disap90',
    description: 'Set disappearing messages to 90 days.',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        await sock.groupToggleEphemeral(from, 90 * 24 * 3600);
        await sock.sendMessage(from, { text: MESSAGES.group.disap.success90 }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.disap.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'disap-off',
    description: 'Turn off disappearing messages.',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        await sock.groupToggleEphemeral(from, 0);
        await sock.sendMessage(from, { text: MESSAGES.group.disap.off }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.disap.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'disap',
    description: 'Instructions for disappearing messages.',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      await sock.sendMessage(from, {
        text: MESSAGES.group.disap.help
      }, { quoted: msg });
    }
  },
  {
    name: 'desc',
    aliases: ['gdesc'],
    description: 'Change the group description.',
    category: 'Group',
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const newDesc = text;
      if (!newDesc) {
        return sock.sendMessage(from, { text: MESSAGES.group.desc.noDesc }, { quoted: msg });
      }
      try {
        await sock.groupUpdateDescription(from, newDesc);
        await sock.sendMessage(from, {
          text: MESSAGES.group.desc.success.replace('{desc}', newDesc)
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.desc.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'lock',
    aliases: ['close'],
    description: 'Only admins can send messages.',
    category: 'Group',
    ownerOnly: true,
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        await sock.groupSettingUpdate(from, 'announcement');
        await sock.sendMessage(from, { text: MESSAGES.group.lock.success }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.lock.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'unlock',
    aliases: ['open'],
    description: 'Allow all members to send messages.',
    category: 'Group',
    groupOnly: true,
    ownerOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        await sock.groupSettingUpdate(from, 'not_announcement');
        await sock.sendMessage(from, { text: MESSAGES.group.unlock.success }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.unlock.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'invite',
    aliases: ['link'],
    description: 'Get the group invite link.',
    category: 'Group',
    groupOnly: true,
    ownerOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const code = await sock.groupInviteCode(from);
        await sock.sendMessage(from, {
          text: MESSAGES.group.invite.success.replace('{code}', code)
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.invite.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'revoke',
    aliases: ['reset'],
    description: 'Revoke current invite link and generate new one.',
    category: 'Group',
    groupOnly: true,
    ownerOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const newCode = await sock.groupRevokeInvite(from);
        await sock.sendMessage(from, {
          text: MESSAGES.group.revoke.success.replace('{code}', newCode)
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.revoke.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'broadcast',
    aliases: ['bc', 'cast'],
    description: 'Send a broadcast message to all groups.',
    category: 'General',
    execute: async ({ sock, from, text, msg }) => {
      const message = text;
      if (!message) {
        return sock.sendMessage(from, { text: MESSAGES.group.broadcast.noMessage }, { quoted: msg });
      }
      try {
        const groups = await sock.groupFetchAllParticipating();
        const groupIds = Object.keys(groups);
        await sock.sendMessage(from, { text: MESSAGES.group.broadcast.start }, { quoted: msg });
        for (const groupId of groupIds) {
          await sock.sendMessage(groupId, { text: MESSAGES.group.broadcast.message.replace('{message}', message) });
        }
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.broadcast.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'left',
    aliases: ['leave'],
    description: 'Force the bot to leave the group.',
    category: 'Group',
    groupOnly: true,
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        await sock.groupLeave(from);
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.leave.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'create',
    aliases: ['newgroup', 'newgc'],
    description: 'Create a new group with users.',
    category: 'General',
    execute: async ({ sock, from, text, msg }) => {
      const args = text.trim().split(/\s+/);
      if (!args.length) {
        return sock.sendMessage(from, {
          text: MESSAGES.group.create.usage
        }, { quoted: msg });
      }
      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      const quotedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
      const [groupName, ...rest] = args;
      const phoneNumbers = rest.filter(n => /^\d+$/.test(n)).map(num => `${num}@s.whatsapp.net`);
      const participants = [...new Set([...mentions, ...(quotedJid ? [quotedJid] : []), ...phoneNumbers])];
      
      if (!groupName || participants.length === 0) {
        return sock.sendMessage(from, {
          text: MESSAGES.group.create.usage
        }, { quoted: msg });
      }
      
      try {
        const group = await sock.groupCreate(groupName, participants);
        await sock.sendMessage(group.id, { text: MESSAGES.group.create.welcome });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.group.create.error }, { quoted: msg });
      }
    }
  }
];
