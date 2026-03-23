import os from 'os'
import moment from 'moment-timezone'
import axios from 'axios'

const startTime = Date.now()

const styles = {
    10: {
        "a": "ᴀ", "b": "ʙ", "c": "ᴄ", "d": "ᴅ", "e": "ᴇ", "f": "ғ", "g": "ɢ", "h": "ʜ", "i": "ɪ", "j": "ᴊ",
        "k": "ᴋ", "l": "ʟ", "m": "ᴍ", "n": "ɴ", "o": "ᴏ", "p": "ᴘ", "q": "ϙ", "r": "ʀ", "s": "s", "t": "ᴛ",
        "u": "ᴜ", "v": "v", "w": "ᴡ", "x": "x", "y": "ʏ", "z": "ᴢ"
    }
}

const applyStyle = (text, styleNum) => {
    const map = styles[styleNum]
    return text.split('').map(c => map[c] || c).join('')
}

const formatUptime = ms => {
    const sec = Math.floor(ms / 1000) % 60
    const min = Math.floor(ms / (1000 * 60)) % 60
    const hr = Math.floor(ms / (1000 * 60 * 60)) % 24
    const day = Math.floor(ms / (1000 * 60 * 60 * 24))
    const parts = []
    if (day === 1) parts.push(`1 day`)
    else if (day > 1) parts.push(`${day} days`)
    if (hr === 1) parts.push(`1 hour`)
    else if (hr > 1) parts.push(`${hr} h`)
    if (min === 1) parts.push(`1 minute`)
    else if (min > 1) parts.push(`${min} m`)
    if (sec === 1) parts.push(`1 second`)
    else if (sec > 1 || parts.length === 0) parts.push(`${sec} s`)
    return parts.join(', ')
}

const detectPlatform = () => {
    const hostEnv = process.env.HOST_PROVIDER?.toLowerCase()
    const providers = {
        'optiklink': 'Optiklink.com',
        'bot-hosting': 'Bot-Hosting.net',
        'heroku': 'Heroku',
        'railway': 'Railway',
        'koyeb': 'Koyeb',
        'render': 'Render',
        'github': 'GitHub Actions',
        'katabump': 'Katabump.com'
    }
    if (hostEnv && providers[hostEnv]) return providers[hostEnv]
    if (process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_ENVIRONMENT) return 'Railway'
    if (process.env.KOYEB_ENV) return 'Koyeb'
    if (process.env.RENDER) return 'Render'
    if (process.env.GITHUB_WORKFLOW || process.env.GITHUB_ACTIONS) return 'GitHub Actions'
    if (process.env.DYNO) return 'Heroku'
    return 'PANEL'
}

const fetchRepoStats = async () => {
    try {
        const response = await axios.get('https://api.github.com/repos/franceking1/Flash-Md-V3')
        const { forks_count, stargazers_count } = response.data
        return {
            forks: forks_count || 0,
            stars: stargazers_count || 0
        }
    } catch {
        return { forks: 0, stars: 0 }
    }
}

export const commands = [
  {
    name: 'menu',
    aliases: ['list'],
    description: 'Show all available bot commands.',
    category: 'General',
    execute: async ({ sock, from, msg, commands, config }) => {
      try {
        const botName = config.BOT_NAME || 'Flash-MD'
        const botVersion = config.BOT_VERSION || '3.0.0'
        const ownerName = config.OWNER_NAME || 'FLASH-MD'
        const tz = config.TZ || 'Africa/Nairobi'
        
        const list = Array.from(commands.values())
        if (!list.length) {
          return sock.sendMessage(from, { text: '❌ Command list not available.' }, { quoted: msg })
        }
        const time = moment().tz(tz)
        const uptime = formatUptime(Date.now() - startTime)
        const platform = detectPlatform()
        const usedMem = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2)
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
        const { forks, stars } = await fetchRepoStats()
        const users = (stars * 3) + (forks * 2)
        const usersFormatted = users.toLocaleString()
        const prefix = config.PREFIXES?.[0] || ' '
        const grouped = {}
        for (const cmd of list) {
            const category = cmd.category || 'General'
            if (!grouped[category]) grouped[category] = []
            grouped[category].push(cmd)
        }
        let menuText = `╭━━━❒ ${applyStyle(`${botName.toUpperCase()} ${botVersion}`, 10)} ❒━━━╮\n`
        menuText += `┃ 🧩 *Commands:* ${list.length.toLocaleString()}\n`
        menuText += `┃ 🪄 *Prefix:* ${prefix}\n`
        menuText += `┃ ⏰ *Time:* ${time.format('HH:mm:ss')}\n`
        menuText += `┃ 🌍 *Timezone:* ${tz}\n`
        menuText += `┃ 📅 *Date:* ${time.format('DD/MM/YYYY')}\n`
        menuText += `┃ 🔋 *Uptime:* ${uptime}\n`
        menuText += `┃ 💻 *Platform:* ${platform}\n`
        menuText += `┃ 💾 *RAM:* ${usedMem}/${totalMem} GB\n`
        menuText += `┃ 👥 *Users:* ${usersFormatted}\n`
        menuText += `┃ 👑 *Owner:* ${ownerName}\n`
        menuText += `╰━━━━━━❒ ${applyStyle(`Version ${botVersion}`, 10)} ❒━━━━━╯\n\n`
        let counter = 1
        const sortedCategories = Object.keys(grouped).sort()
        for (const category of sortedCategories) {
            const commandsInCategory = grouped[category]
                .filter(c => c.name)
                .sort((a, b) => a.name.localeCompare(b.name))
            if (commandsInCategory.length === 0) continue
            menuText += `*╭──❒ ${applyStyle(category.toUpperCase(), 10)} ❒───⊷*\n`
            menuText += `│╭────────────\n`
            for (const cmd of commandsInCategory) {
                menuText += `││ ${counter++}. ${applyStyle(cmd.name, 10)}\n`
            }
            menuText += `│╰────────────\n`
            menuText += `╰══════════════⊷\n\n`
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
        }, { quoted: msg })
      } catch (error) {
        console.error('Menu error:', error)
        await sock.sendMessage(from, { text: '❌ Error loading menu.' }, { quoted: msg })
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
        const botName = config.BOT_NAME || 'Flash-MD'
        const botVersion = config.BOT_VERSION || '3.0.0'
        
        const list = Array.from(commands.values())
        if (!list.length) {
          return sock.sendMessage(from, { text: '❌ Command list not available.' }, { quoted: msg })
        }
        const prefix = config.PREFIXES?.[0] || ' '
        let helpText = `╭━━━❒ ${applyStyle(`${botName.toUpperCase()} ${botVersion} HELP `, 10)} ❒━━━╮\n`
        helpText += `┃ 🪄 *Prefix:* ${prefix}\n`
        helpText += `┃ 📖 *Usage:* ${prefix} <command>\n`
        helpText += `┃ ℹ️  *Type:* ${prefix} menu for command list\n`
        helpText += `┃ ⚡ *Powered by:* ${botName} ${botVersion}\n`
        helpText += `╰━━━━━━━━━━━━━━━━━━━━━━━╯\n\n`
        const grouped = {}
        for (const cmd of list) {
            const category = cmd.category || 'General'
            if (!grouped[category]) grouped[category] = []
            grouped[category].push(cmd)
        }
        const sortedCategories = Object.keys(grouped).sort()
        for (const category of sortedCategories) {
            const commandsInCategory = grouped[category]
                .filter(c => c.name)
                .sort((a, b) => a.name.localeCompare(b.name))
            if (commandsInCategory.length === 0) continue
            helpText += `╭──❒ ${applyStyle(category.toUpperCase(), 10)} ❒───⊷\n`
            helpText += `│\n`
            for (const cmd of commandsInCategory) {
                helpText += `│ • *${applyStyle(cmd.name, 10)}*\n`
                helpText += `│   ↳ ${cmd.description || 'No description'}\n`
                if (cmd.aliases && cmd.aliases.length > 0) {
                    helpText += `│   ↳ Aliases: ${cmd.aliases.map(a => applyStyle(a, 10)).join(', ')}\n`
                }
                helpText += `│\n`
            }
            helpText += `╰══════════════⊷\n\n`
        }
        helpText += `_Use ${prefix}<command> to execute any command_\n`
        helpText += `_⚡ Powered by ${botName} ${botVersion}_`
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
        }, { quoted: msg })
      } catch (error) {
        console.error('Help error:', error)
        await sock.sendMessage(from, { text: '❌ Error loading help.' }, { quoted: msg })
      }
    }
  }
]
