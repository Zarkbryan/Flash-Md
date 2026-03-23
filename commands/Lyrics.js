import axios from 'axios'
import { MESSAGES } from '../france/index.js'

export const commands = [
{
  name: 'lyrics',
  aliases: ['lyric','songlyrics'],
  description: 'Get song lyrics',
  category: 'Search',

  execute: async ({ sock, from, text, msg, config }) => {

    const botName = config.BOT_NAME || 'Flash-MD'
    const botVersion = config.BOT_VERSION || '3.0.0'

    if (!text) {
      return sock.sendMessage(from,{
        text: MESSAGES.lyrics.noQuery
          .replace('{botName}',botName)
          .replace('{botVersion}',botVersion)
      },{ quoted: msg })
    }

    try {

      const url = `https://api.popcat.xyz/v2/lyrics?song=${encodeURIComponent(text)}`
      const { data } = await axios.get(url)

      if (data.error || !data.message) {
        return sock.sendMessage(from,{
          text: MESSAGES.lyrics.notFound
        },{ quoted: msg })
      }

      const song = data.message

      const caption = MESSAGES.lyrics.result
        .replace('{title}', song.title)
        .replace('{artist}', song.artist)
        .replace('{lyrics}', song.lyrics.slice(0,3500))
        .replace('{url}', song.url)

      await sock.sendMessage(from,{
        image:{ url: song.image },
        caption
      },{ quoted: msg })

    } catch (err) {

      sock.sendMessage(from,{
        text: MESSAGES.lyrics.error
          .replace('{botName}',botName)
          .replace('{botVersion}',botVersion)
      },{ quoted: msg })

    }

  }
}
]
