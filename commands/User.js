import { S_WHATSAPP_NET } from '@whiskeysockets/baileys';
import * as Jimp from 'jimp';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import { formatJid, getSenderJid, MESSAGES, protectOwner } from '../france/index.js';

let isStatusFetching = false;
let fetchInterval = null;

export const commands = [
  {
    name: 'block',
    description: 'Block a WhatsApp user',
    category: 'USER',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      let targetJid;
      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = msg.message.extendedTextMessage.contextInfo.participant;
      } else if (text) {
        targetJid = text.includes('@s.whatsapp.net') ? text : formatJid(text);
      } else {
        return sock.sendMessage(from, { text: MESSAGES.user.block.noTarget }, { quoted: msg });
      }
      
      if (protectOwner(targetJid)) {
        return sock.sendMessage(from, { text: MESSAGES.user.block.protected }, { quoted: msg });
      }
      
      try {
        await sock.updateBlockStatus(targetJid, 'block');
        await sock.sendMessage(from, { text: MESSAGES.user.block.success.replace('{jid}', targetJid) }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.user.block.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'unblock',
    description: 'Unblock a WhatsApp user',
    category: 'USER',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      let targetJid;
      if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
        targetJid = msg.message.extendedTextMessage.contextInfo.participant;
      } else if (text) {
        targetJid = text.includes('@s.whatsapp.net') ? text : formatJid(text);
      } else {
        return sock.sendMessage(from, { text: MESSAGES.user.unblock.noTarget }, { quoted: msg });
      }
      
      if (protectOwner(targetJid)) {
        return sock.sendMessage(from, { text: MESSAGES.user.unblock.protected }, { quoted: msg });
      }
      
      try {
        await sock.updateBlockStatus(targetJid, 'unblock');
        await sock.sendMessage(from, { text: MESSAGES.user.unblock.success.replace('{jid}', targetJid) }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.user.unblock.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'setbio',
    description: 'Set WhatsApp bio',
    category: 'USER',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      if (!text) {
        return sock.sendMessage(from, { text: MESSAGES.user.setbio.noText }, { quoted: msg });
      }
      
      try {
        await sock.query({
          tag: 'iq',
          attrs: { to: S_WHATSAPP_NET, type: 'set', xmlns: 'status' },
          content: [{ tag: 'status', attrs: {}, content: Buffer.from(text, 'utf-8') }]
        });
        await sock.sendMessage(from, { text: MESSAGES.user.setbio.success }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.user.setbio.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'autobio',
    description: 'Toggle automatic bio',
    category: 'USER',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      if (!text) {
        return sock.sendMessage(from, { text: MESSAGES.user.autobio.usage }, { quoted: msg });
      }
      
      if (text === 'on') {
        if (isStatusFetching) {
          return sock.sendMessage(from, { text: MESSAGES.user.autobio.alreadyOn }, { quoted: msg });
        }
        
        isStatusFetching = true;
        fetchInterval = setInterval(async () => {
          try {
            const res = await fetch('https://nekos.life/api/v2/fact');
            const data = await res.json();
            const bio = `FLASH-MD: ${data.fact}`;
            await sock.query({
              tag: 'iq',
              attrs: { to: S_WHATSAPP_NET, type: 'set', xmlns: 'status' },
              content: [{ tag: 'status', attrs: {}, content: Buffer.from(bio, 'utf-8') }]
            });
          } catch {}
        }, 60000);
        return sock.sendMessage(from, { text: MESSAGES.user.autobio.enabled }, { quoted: msg });
      }
      
      if (text === 'off') {
        if (!isStatusFetching) {
          return sock.sendMessage(from, { text: MESSAGES.user.autobio.alreadyOff }, { quoted: msg });
        }
        
        clearInterval(fetchInterval);
        isStatusFetching = false;
        return sock.sendMessage(from, { text: MESSAGES.user.autobio.disabled }, { quoted: msg });
      }
      
      await sock.sendMessage(from, { text: MESSAGES.user.autobio.usage }, { quoted: msg });
    }
  },
  {
    name: 'getpp',
    description: 'Get profile picture',
    category: 'USER',
    execute: async ({ sock, from, msg }) => {
      const targetJid = msg.message?.extendedTextMessage?.contextInfo?.participant || getSenderJid(msg);
      let pp;
      try {
        pp = await sock.profilePictureUrl(targetJid, 'image');
      } catch {
        pp = MESSAGES.user.getpp.defaultImage;
      }
      await sock.sendMessage(from, { image: { url: pp }, caption: MESSAGES.user.getpp.caption }, { quoted: msg });
    }
  },
  {
    name: 'whois',
    description: 'User information',
    category: 'USER',
    execute: async ({ sock, from, msg }) => {
      const targetJid = msg.message?.extendedTextMessage?.contextInfo?.participant || getSenderJid(msg);
      const number = targetJid.split('@')[0];
      
      let pp;
      try {
        pp = await sock.profilePictureUrl(targetJid, 'image');
      } catch {
        pp = MESSAGES.user.whois.defaultImage;
      }
      
      let about = 'No status';
      let setOn = 'Unknown';
      let setAt = 'Unknown';
      
      try {
        const st = await sock.fetchStatus(targetJid);
        if (Array.isArray(st) && st[0]?.status?.status) {
          about = st[0].status.status;
          const d = new Date(st[0].status.setAt);
          
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          
          const hours = String(d.getHours()).padStart(2, '0');
          const minutes = String(d.getMinutes()).padStart(2, '0');
          const seconds = String(d.getSeconds()).padStart(2, '0');
          
          setOn = `${day}/${month}/${year}`;
          setAt = `${hours}:${minutes}:${seconds}`;
        }
      } catch {}
      
      const caption = MESSAGES.user.whois.info
        .replace('{about}', about)
        .replace('{number}', number)
        .replace('{setOn}', setOn)
        .replace('{setAt}', setAt);
      
      await sock.sendMessage(
        from,
        {
          image: { url: pp },
          caption,
          mentions: [targetJid]
        },
        { quoted: msg }
      );
    }
  },
  {
    name: 'mygroups',
    description: 'List all groups',
    category: 'USER',
    ownerOnly: true,
    execute: async ({ sock, from, msg }) => {
      try {
        const groups = Object.values(await sock.groupFetchAllParticipating());
        let text = MESSAGES.user.mygroups.header;
        for (const g of groups) {
          text += MESSAGES.user.mygroups.item
            .replace('{subject}', g.subject)
            .replace('{count}', g.participants.length)
            .replace('{id}', g.id);
        }
        await sock.sendMessage(from, { text }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.user.mygroups.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'del',
    description: 'Delete a replied message',
    category: 'USER',
    ownerOnly: true,
    execute: async ({ sock, from, msg }) => {
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      if (!ctx) return;
      await sock.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe: false,
          id: ctx.stanzaId,
          participant: ctx.participant
        }
      });
    }
  },
  {
    name: 'restart',
    description: 'Restart bot',
    category: 'USER',
    ownerOnly: true,
    execute: async ({ sock, from, msg }) => {
      await sock.sendMessage(from, { text: MESSAGES.user.restart.message }, { quoted: msg });
      process.exit(0);
    }
  }
];
