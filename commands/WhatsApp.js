import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'fs-extra';
import path from 'path';
import * as Jimp from 'jimp';
import { MESSAGES } from '../france/index.js';
import CONFIG from '../config.js';

const S_WHATSAPP_NET = 's.whatsapp.net';

function getOwnerJid() {
  if (!CONFIG.OWNER_NUMBER) return null
  let ownerNumber = CONFIG.OWNER_NUMBER.toString()
  ownerNumber = ownerNumber.replace(/[+\s]/g, '')
  ownerNumber = ownerNumber.replace(/[^0-9]/g, '')
  return `${ownerNumber}@s.whatsapp.net`
}

async function getBuffer(message, type) {
  const stream = await downloadContentFromMessage(message, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const resizeImage = async (imagePath) => {
  const image = await Jimp.read(imagePath);
  const resized = image.crop(0, 0, image.getWidth(), image.getHeight()).scaleToFit(720, 720);
  return {
    img: await resized.getBufferAsync(Jimp.MIME_JPEG),
    preview: await resized.normalize().getBufferAsync(Jimp.MIME_JPEG)
  };
};

const restrictedJIDs = [
  "254742063632@s.whatsapp.net",
  "254750948696@s.whatsapp.net",
  "254757835036@s.whatsapp.net",
  "254751284190@s.whatsapp.net"
];

function formatJid(input) {
  const cleaned = input.replace(/[^0-9]/g, '');
  return `${cleaned}@s.whatsapp.net`;
}

function getSenderJid(msg) {
  return msg.key.participant || msg.key.remoteJid;
}

let isStatusFetching = false;
let fetchInterval;

export const commands = [
  {
    name: "fullpp",
    description: "Set your profile picture without compression (owner only).",
    category: "WhatsApp",
    aliases: ["mypp", "dp"],
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedImage = quoted?.imageMessage;
      
      if (!quotedImage) {
        return sock.sendMessage(from, {
          text: MESSAGES.whatsapp.fullpp.noImage
        }, { quoted: msg });
      }
      
      try {
        const buffer = await getBuffer(quotedImage, "image");
        const mediaPath = path.join(process.cwd(), "temp", `${Date.now()}.jpg`);
        await fs.ensureDir(path.dirname(mediaPath));
        await fs.writeFile(mediaPath, buffer);
        const resized = await resizeImage(mediaPath);
        
        await sock.query({
          tag: "iq",
          attrs: {
            to: S_WHATSAPP_NET,
            type: "set",
            xmlns: "w:profile:picture"
          },
          content: [{
            tag: "picture",
            attrs: { type: "image" },
            content: resized.img
          }]
        });
        
        await sock.sendMessage(from, {
          text: MESSAGES.whatsapp.fullpp.success
        }, { quoted: msg });
        await fs.unlink(mediaPath);
      } catch (err) {
        console.error("Fullpp error:", err);
        await sock.sendMessage(from, {
          text: MESSAGES.whatsapp.fullpp.error
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'privacy',
    aliases: [],
    description: 'Displays your current privacy settings.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const privacySettings = await sock.fetchPrivacySettings(true);
        const name = sock.user?.name || "User";
        const avatar = await sock.profilePictureUrl(sock.user.id, 'image').catch(() => 'https://telegra.ph/file/b34645ca1e3a34f1b3978.jpg');
        
        const caption = MESSAGES.whatsapp.privacy.info
          .replace('{name}', name)
          .replace('{online}', privacySettings.online || 'N/A')
          .replace('{profile}', privacySettings.profile || 'N/A')
          .replace('{last}', privacySettings.last || 'N/A')
          .replace('{readreceipts}', privacySettings.readreceipts || 'N/A')
          .replace('{status}', privacySettings.status || 'N/A')
          .replace('{groupadd}', privacySettings.groupadd || 'N/A')
          .replace('{calladd}', privacySettings.calladd || 'N/A');
        
        await sock.sendMessage(from, {
          image: { url: avatar },
          caption: caption
        }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.privacy.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'pin',
    description: 'Pin a chat.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        await sock.chatModify({ pin: true }, from);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.pin.success }, { quoted: msg });
      } catch (err) {
        console.error('Pin error:', err);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.pin.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'unpin',
    description: 'Unpin a chat.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        await sock.chatModify({ pin: false }, from);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.unpin.success }, { quoted: msg });
      } catch (err) {
        console.error('Unpin error:', err);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.unpin.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'star',
    description: 'Star a quoted message.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
      const fromMe = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user.id;
      
      if (!quoted) {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.star.noReply }, { quoted: msg });
        return;
      }
      
      try {
        await sock.chatModify({
          star: {
            messages: [{ id: quoted, fromMe }],
            star: true
          }
        }, from);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.star.success }, { quoted: msg });
      } catch (err) {
        console.error('Star error:', err);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.star.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'unstar',
    description: 'Unstar a quoted message.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
      const fromMe = msg.message?.extendedTextMessage?.contextInfo?.participant === sock.user.id;
      
      if (!quoted) {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.unstar.noReply }, { quoted: msg });
        return;
      }
      
      try {
        await sock.chatModify({
          star: {
            messages: [{ id: quoted, fromMe }],
            star: false
          }
        }, from);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.unstar.success }, { quoted: msg });
      } catch (err) {
        console.error('Unstar error:', err);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.unstar.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'mydp',
    aliases: [],
    description: 'Updates your profile picture privacy setting.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const options = {
        all: MESSAGES.whatsapp.mydp.options.all,
        contacts: MESSAGES.whatsapp.mydp.options.contacts,
        contact_blacklist: MESSAGES.whatsapp.mydp.options.contact_blacklist,
        none: MESSAGES.whatsapp.mydp.options.none
      };
      
      const choice = text.toLowerCase();
      if (!choice || !options[choice]) {
        const help = MESSAGES.whatsapp.mydp.help.replace('{options}', Object.entries(options).map(([k, v]) => `- *${k}*: ${v}`).join('\n'));
        return sock.sendMessage(from, { text: help }, { quoted: msg });
      }
      
      try {
        await sock.updateProfilePicturePrivacy(choice);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.mydp.success.replace('{choice}', choice) }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.mydp.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'mystatus',
    aliases: [],
    description: 'Updates your status privacy setting.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const options = {
        all: MESSAGES.whatsapp.mystatus.options.all,
        contacts: MESSAGES.whatsapp.mystatus.options.contacts,
        contact_blacklist: MESSAGES.whatsapp.mystatus.options.contact_blacklist,
        none: MESSAGES.whatsapp.mystatus.options.none
      };
      
      const choice = text.toLowerCase();
      if (!choice || !options[choice]) {
        const help = MESSAGES.whatsapp.mystatus.help.replace('{options}', Object.entries(options).map(([k, v]) => `- *${k}*: ${v}`).join('\n'));
        return sock.sendMessage(from, { text: help }, { quoted: msg });
      }
      
      try {
        await sock.updateStatusPrivacy(choice);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.mystatus.success.replace('{choice}', choice) }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.mystatus.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'groupadd',
    aliases: [],
    description: 'Updates who can add you to groups.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const options = {
        all: MESSAGES.whatsapp.groupadd.options.all,
        contacts: MESSAGES.whatsapp.groupadd.options.contacts,
        contact_blacklist: MESSAGES.whatsapp.groupadd.options.contact_blacklist,
        none: MESSAGES.whatsapp.groupadd.options.none
      };
      
      const choice = text.toLowerCase();
      if (!choice || !options[choice]) {
        const help = MESSAGES.whatsapp.groupadd.help.replace('{options}', Object.entries(options).map(([k, v]) => `- *${k}*: ${v}`).join('\n'));
        return sock.sendMessage(from, { text: help }, { quoted: msg });
      }
      
      try {
        await sock.updateGroupsAddPrivacy(choice);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.groupadd.success.replace('{choice}', choice) }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.groupadd.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'lastseen',
    aliases: [],
    description: 'Updates your last seen privacy settings.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const availablePrivacies = {
        all: MESSAGES.whatsapp.lastseen.options.all,
        contacts: MESSAGES.whatsapp.lastseen.options.contacts,
        contact_blacklist: MESSAGES.whatsapp.lastseen.options.contact_blacklist,
        none: MESSAGES.whatsapp.lastseen.options.none
      };
      
      const priv = text.toLowerCase();
      if (!priv || !availablePrivacies[priv]) {
        let helpText = MESSAGES.whatsapp.lastseen.help;
        for (const [key, desc] of Object.entries(availablePrivacies)) {
          helpText += `- *${key}*: ${desc}\n`;
        }
        helpText += MESSAGES.whatsapp.lastseen.example;
        return await sock.sendMessage(from, { text: helpText }, { quoted: msg });
      }
      
      try {
        await sock.updateLastSeenPrivacy(priv);
        await sock.sendMessage(from, {
          text: MESSAGES.whatsapp.lastseen.success.replace('{priv}', priv).replace('{desc}', availablePrivacies[priv])
        }, { quoted: msg });
      } catch (error) {
        console.error('Failed to update last seen:', error);
        await sock.sendMessage(from, {
          text: MESSAGES.whatsapp.lastseen.error
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'myonline',
    aliases: [],
    description: 'Updates your online privacy setting.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const options = {
        all: MESSAGES.whatsapp.myonline.options.all,
        match_last_seen: MESSAGES.whatsapp.myonline.options.match_last_seen
      };
      
      const choice = text.toLowerCase();
      if (!choice || !options[choice]) {
        const help = MESSAGES.whatsapp.myonline.help.replace('{options}', Object.entries(options).map(([k, v]) => `- *${k}*: ${v}`).join('\n'));
        return sock.sendMessage(from, { text: help }, { quoted: msg });
      }
      
      try {
        await sock.updateOnlinePrivacy(choice);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.myonline.success.replace('{choice}', choice) }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.myonline.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'onwa',
    aliases: ["checkid", "checkno"],
    description: 'Checks if a WhatsApp ID exists.',
    category: 'WhatsApp',
    execute: async ({ sock, from, text, msg }) => {
      const rawNumber = text.trim().split(/\s+/)[0];
      if (!rawNumber) return await sock.sendMessage(from, { text: MESSAGES.whatsapp.onwa.noNumber }, { quoted: msg });
      
      const number = rawNumber.replace(/[^\d]/g, '');
      if (number.length < 10) {
        return await sock.sendMessage(from, { text: MESSAGES.whatsapp.onwa.invalid }, { quoted: msg });
      }
      
      const waJid = `${number}@s.whatsapp.net`;
      try {
        const [result] = await sock.onWhatsApp(waJid);
        const response = result?.exists ? MESSAGES.whatsapp.onwa.exists.replace('{number}', rawNumber) : MESSAGES.whatsapp.onwa.notExists.replace('{number}', rawNumber);
        await sock.sendMessage(from, { text: response }, { quoted: msg });
      } catch (error) {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.onwa.error }, { quoted: msg });
        console.error('checkIdCommand error:', error);
      }
    }
  },
  {
    name: 'bizprofile',
    aliases: ["bizp"],
    description: 'Fetches business description and category.',
    category: 'WhatsApp',
    execute: async ({ sock, from, text, msg }) => {
      const targetJid = text ? `${text.replace(/[^0-9]/g, '')}@s.whatsapp.net` : from;
      try {
        const profile = await sock.getBusinessProfile(targetJid);
        const textMsg = MESSAGES.whatsapp.bizprofile.result
          .replace('{description}', profile.description || 'N/A')
          .replace('{category}', profile.category || 'N/A');
        await sock.sendMessage(from, { text: textMsg }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.bizprofile.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'removedp',
    aliases: [],
    description: 'Removes your profile picture.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        await sock.removeProfilePicture(from);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.removedp.success }, { quoted: msg });
      } catch (err) {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.removedp.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'archive',
    aliases: [],
    description: 'Archives the current chat.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const lastMsgInChat = msg;
        await sock.chatModify({ archive: true, lastMessages: [lastMsgInChat] }, from);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.archive.success }, { quoted: msg });
      } catch (error) {
        console.error('Error archiving chat:', error);
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.archive.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'vv',
    aliases: [],
    description: 'Reveals view-once images, videos or audios.',
    category: 'User',
    execute: async ({ sock, from, text, msg }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return;
      
      const viewOnceMedia = quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce;
      if (!viewOnceMedia) return;
      
      try {
        let sendMsg;
        if (quoted.imageMessage) {
          const buffer = await getBuffer(quoted.imageMessage, 'image');
          sendMsg = {
            image: buffer,
            caption: MESSAGES.whatsapp.vv.caption
          };
        } else if (quoted.videoMessage) {
          const buffer = await getBuffer(quoted.videoMessage, 'video');
          sendMsg = {
            video: buffer,
            caption: MESSAGES.whatsapp.vv.caption
          };
        } else if (quoted.audioMessage) {
          const buffer = await getBuffer(quoted.audioMessage, 'audio');
          sendMsg = {
            audio: buffer,
            mimetype: 'audio/mp4'
          };
        }
        if (sendMsg) {
          await sock.sendMessage(from, sendMsg, { quoted: msg });
        }
      } catch (err) {
        console.error('vv command error:', err);
      }
    }
  },
  {
    name: 'vv2',
    aliases: ["😲","❤️","👍"],
    description: 'Sends the view once media to the bot owner.',
    category: 'User',
    execute: async ({ sock, from, text, msg }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!quoted) return;
      
      const viewOnceImage = quoted.imageMessage?.viewOnce;
      const viewOnceVideo = quoted.videoMessage?.viewOnce;
      const viewOnceAudio = quoted.audioMessage?.viewOnce;
      if (!viewOnceImage && !viewOnceVideo && !viewOnceAudio) return;
      
      const ownerJid = getOwnerJid();
      if (!ownerJid) {
        console.log('Owner number not configured in config.js');
        return;
      }
      
      try {
        let sendMsg;
        if (quoted.imageMessage) {
          const buffer = await getBuffer(quoted.imageMessage, 'image');
          sendMsg = {
            image: buffer,
            caption: MESSAGES.whatsapp.vv.caption
          };
        } else if (quoted.videoMessage) {
          const buffer = await getBuffer(quoted.videoMessage, 'video');
          sendMsg = {
            video: buffer,
            caption: MESSAGES.whatsapp.vv.caption
          };
        } else if (quoted.audioMessage) {
          const buffer = await getBuffer(quoted.audioMessage, 'audio');
          sendMsg = {
            audio: buffer,
            mimetype: 'audio/mp4'
          };
        }
        if (sendMsg) {
          await sock.sendMessage(ownerJid, sendMsg);
        }
      } catch (error) {
        console.error('vv2Command error:', error);
      }
    }
  },
  {
    name: 'details',
    aliases: [],
    description: 'Displays the full raw quoted message using Baileys structure.',
    category: 'User',
    execute: async ({ sock, from, text, msg }) => {
      const context = msg.message?.extendedTextMessage?.contextInfo;
      const quoted = context?.quotedMessage;
      
      if (!quoted) {
        return sock.sendMessage(from, { text: MESSAGES.whatsapp.details.noReply }, { quoted: msg });
      }
      
      try {
        const json = JSON.stringify(quoted, null, 2);
        const parts = json.match(/[\s\S]{1,3500}/g) || [];
        for (const part of parts) {
          await sock.sendMessage(from, {
            text: MESSAGES.whatsapp.details.result.replace('{part}', part)
          }, { quoted: msg });
        }
      } catch (error) {
        await sock.sendMessage(from, { text: MESSAGES.whatsapp.details.error }, { quoted: msg });
      }
    }
  },
  {
    name: 'blocklist',
    aliases: ['blocked'],
    description: 'Shows the list of blocked users.',
    category: 'WhatsApp',
    ownerOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      try {
        const blockedJids = await sock.fetchBlocklist();
        if (!blockedJids || blockedJids.length === 0) {
          return await sock.sendMessage(from, { text: MESSAGES.whatsapp.blocklist.empty }, { quoted: msg });
        }
        const formattedList = blockedJids.map((b, i) => `${i + 1}. ${b.replace('@s.whatsapp.net', '')}`).join('\n');
        await sock.sendMessage(from, {
          text: MESSAGES.whatsapp.blocklist.result.replace('{list}', formattedList)
        }, { quoted: msg });
      } catch (error) {
        console.error('Error fetching block list:', error);
        await sock.sendMessage(from, {
          text: MESSAGES.whatsapp.blocklist.error
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'vcard',
    aliases: ['card'],
    description: 'Save a contact from a replied message with a custom name.',
    category: 'WhatsApp',
    execute: async ({ sock, from, text, msg }) => {
      const quotedContext = msg.message?.extendedTextMessage?.contextInfo;
      const quotedSender = quotedContext?.participant || quotedContext?.remoteJid;
      
      if (!quotedSender) {
        return await sock.sendMessage(from, { text: MESSAGES.whatsapp.vcard.noReply }, { quoted: msg });
      }
      
      if (!text) {
        return await sock.sendMessage(from, { text: MESSAGES.whatsapp.vcard.noName }, { quoted: msg });
      }
      
      const name = text;
      const phoneNumber = quotedSender.split('@')[0];
      const vcardString = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;type=VOICE;waid=${phoneNumber}:${phoneNumber}\nEND:VCARD`;
      
      await sock.sendMessage(
        from,
        {
          contacts: {
            displayName: name,
            contacts: [{ displayName: name, vcard: vcardString }]
          }
        },
        { quoted: msg }
      );
    }
  },
  {
    name: 'location',
    aliases: ['loc'],
    description: 'Returns Google Maps link from a replied location message.',
    category: 'WhatsApp',
    execute: async ({ sock, from, text, msg }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const locMsg = quoted?.locationMessage;
      
      if (!locMsg) {
        return await sock.sendMessage(from, { text: MESSAGES.whatsapp.location.noReply }, { quoted: msg });
      }
      
      const { degreesLatitude, degreesLongitude } = locMsg;
      const mapUrl = `https://maps.google.com/?q=${degreesLatitude},${degreesLongitude}`;
      
      await sock.sendMessage(from, {
        text: MESSAGES.whatsapp.location.result.replace('{url}', mapUrl),
        previewType: 0,
        contextInfo: { isForwarded: true }
      }, { quoted: msg });
    }
  }
];
