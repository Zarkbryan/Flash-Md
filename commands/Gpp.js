import { 
  downloadContentFromMessage,
  processGroupImage,
  MESSAGES
} from '../france/index.js';

import fs from 'fs-extra';
import path from 'path';

export const commands = [
  {
    name: "fullgpp",
    description: "Set group profile picture without cropping or compression.",
    category: "Group",
    aliases: ["fullgp", "gpp"],
    groupOnly: true,
    adminOnly: true,
    botAdminOnly: true,
    execute: async ({ sock, from, text, msg }) => {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedImage = quoted?.imageMessage;
      
      if (!quotedImage) {
        return sock.sendMessage(from, {
          text: MESSAGES.gpp.noImage
        }, { quoted: msg });
      }
      
      try {
        const buffer = await downloadContentFromMessage(quotedImage, "image");
        const imgBuffer = await processGroupImage(buffer);
        
        await sock.updateProfilePicture(from, imgBuffer);
        
        await sock.sendMessage(from, {
          text: MESSAGES.gpp.success
        }, { quoted: msg });
      } catch (err) {
        console.error(err);
        await sock.sendMessage(from, {
          text: MESSAGES.gpp.error
        }, { quoted: msg });
      }
    }
  }
];
