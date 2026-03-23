import { fetchStories, fetchElement, MESSAGES } from '../france/index.js';

export const commands = [
  {
    name: 'math',
    category: 'General',
    execute: async ({ sock, from, text, msg }) => {
      const input = text.replace(/\s+/g, '');

      if (!/^[0-9+\-*/().]+$/.test(input)) {
        return sock.sendMessage(from, { 
          text: MESSAGES.math.invalidFormat
        }, { quoted: msg });
      }

      try {
        const result = eval(input);
        if (!isFinite(result)) {
          return sock.sendMessage(from, { 
            text: MESSAGES.math.invalidOperation
          }, { quoted: msg });
        }

        await sock.sendMessage(from, { 
          text: MESSAGES.math.result.replace('{result}', result)
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, { 
          text: MESSAGES.math.error
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'element',
    aliases: ['chem', 'study'],
    category: 'User',
    execute: async ({ sock, from, text, msg }) => {
      if (!text) {
        return sock.sendMessage(from, {
          text: MESSAGES.element.noQuery
        }, { quoted: msg });
      }

      try {
        const result = await fetchElement(text);

        if (result && !result.error) {
          const info = MESSAGES.element.info
            .replace('{name}', result.name)
            .replace('{symbol}', result.symbol)
            .replace('{atomic_number}', result.atomic_number)
            .replace('{atomic_mass}', result.atomic_mass)
            .replace('{period}', result.period)
            .replace('{phase}', result.phase)
            .replace('{discovered_by}', result.discovered_by);

          if (result.image) {
            await sock.sendMessage(from, {
              image: { url: result.image },
              caption: info
            }, { quoted: msg });
          } else {
            await sock.sendMessage(from, {
              text: info
            }, { quoted: msg });
          }
        } else {
          await sock.sendMessage(from, {
            text: MESSAGES.element.notFound
          }, { quoted: msg });
        }
      } catch (error) {
        await sock.sendMessage(from, {
          text: MESSAGES.element.error
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'story',
    aliases: ['igstories', 'stories'],
    description: 'Fetch Instagram stories using.',
    category: 'Download',
    execute: async ({ sock, from, text, msg }) => {
      const username = text?.toLowerCase();
      if (!username) {
        return sock.sendMessage(from, {
          text: MESSAGES.story.noUsername
        }, { quoted: msg });
      }

      try {
        const res = await fetchStories(username);

        if (!res || res.total === 0 || !Array.isArray(res.items)) {
          return sock.sendMessage(from, {
            text: MESSAGES.story.noStories.replace('{username}', username)
          }, { quoted: msg });
        }

        const stories = res.items.slice(0, 5);

        for (const [index, item] of stories.entries()) {
          const caption = MESSAGES.story.caption
            .replace('{username}', username)
            .replace('{current}', index + 1)
            .replace('{total}', stories.length);

          if (item.type === 'image') {
            await sock.sendMessage(from, {
              image: { url: item.url },
              caption
            }, { quoted: msg });
          } else if (item.type === 'video') {
            await sock.sendMessage(from, {
              video: { url: item.url },
              caption
            }, { quoted: msg });
          } else {
            await sock.sendMessage(from, {
              text: MESSAGES.story.unknown.replace('{url}', item.url)
            }, { quoted: msg });
          }
        }

      } catch (error) {
        console.error('Error fetching Instagram stories:', error);
        return sock.sendMessage(from, {
          text: MESSAGES.story.error.replace('{username}', username)
        }, { quoted: msg });
      }
    }
  },
  {
    name: 'image-dl',
    aliases: ['imgdl'],
    description: 'Download high-quality images from social media URLs',
    category: 'Download',
    execute: async ({ sock, from, text, msg }) => {
      if (!text) {
        return sock.sendMessage(from, {
          text: MESSAGES.imageDl.noUrl
        }, { quoted: msg });
      }

      try {
        const res = await fetch(`https://bk9.fun/download/alldownload?url=${encodeURIComponent(text)}`);
        const data = await res.json();

        if (data.status && data.BK9 && data.BK9.high) {
          await sock.sendMessage(from, {
            image: { url: data.BK9.high },
            caption: MESSAGES.imageDl.caption
          }, { quoted: msg });

          await sock.sendMessage(from, {
            text: MESSAGES.imageDl.success
          }, { quoted: msg });
        } else {
          await sock.sendMessage(from, {
            text: MESSAGES.imageDl.noImage
          }, { quoted: msg });
        }
      } catch (error) {
        console.error('Image-DL Error:', error);
        await sock.sendMessage(from, {
          text: MESSAGES.imageDl.error
        }, { quoted: msg });
      }
    }
  }
]; 
