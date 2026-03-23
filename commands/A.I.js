import { 
  geminiVision2, 
  intelQuery,
  callGeminiAPI,
  callLlamaAPI,
  getRandomWallpaper,
  generatePairCode,
  getRandomJoke,
  getRandomAdvice,
  getRandomTrivia,
  getRandomQuote,
  formatPhoneNumber,
  truncateMessage,
  formatError,
  isValidPhoneNumber,
  delay,
  MESSAGES,
  LIMITS
} from '../france/index.js';

export const commands = [
  {
    name: 'deepseek',
    aliases: ['intel', 'findout'],
    description: 'Conducts an AI-powered investigation and returns summarized insights.',
    category: 'AI',
    execute: async ({ sock, from, text, msg }) => {
      const inputQuery = text.trim();

      if (!inputQuery) {
        return sock.sendMessage(from, { text: MESSAGES.deepseek.noQuery });
      }

      try {
        await sock.sendMessage(from, { text: MESSAGES.deepseek.gathering });
        const data = await intelQuery(inputQuery);

        const summary = data.summary?.trim() || '_No summary available._';
        const references = data.references?.length
          ? '\n🌍 *References:*\n' + data.references.map((url, idx) => `${idx + 1}. ${url}`).join('\n')
          : '';
        const cost = data.stats?.cost ? `\n💰 *Estimated Cost:* $${data.stats.cost.toFixed(2)}` : '';
        const agent = data.stats?.engine ? `\n🤖 *Agent Type:* ${data.stats.engine}` : '';
        const stats = `\n📑 *Pages:* ${data.stats.pages} | 🖼 *Images:* ${data.stats.images}`;

        const messageBody = `🧾 *Intel Report:*\n\n${summary}${references}${cost}${agent}${stats}`;
        const output = truncateMessage(messageBody);

        await sock.sendMessage(from, { text: output });
      } catch (err) {
        await sock.sendMessage(from, { text: formatError(err, MESSAGES.deepseek.error) });
      }
    }
  },
  {
    name: 'imagine',
    aliases: ['draw', 'generate'],
    description: 'Generate an image using Gemini AI.',
    category: 'AI',
    execute: async ({ sock, from, text, msg }) => {
      if (!text) {
        return sock.sendMessage(from, { text: MESSAGES.imagine.noPrompt });
      }

      const prompt = text;
      const ai = new geminiVision2();

      try {
        await sock.sendMessage(from, { text: MESSAGES.imagine.generating });
        
        const predictions = await ai.image(prompt, {
          model: 'imagen-3.0-generate-002',
          aspect_ratio: '9:16'
        });

        const base64 = predictions?.[0]?.bytesBase64Encoded;

        if (!base64) {
          return sock.sendMessage(from, { text: MESSAGES.imagine.noImage });
        }

        const imageBuffer = Buffer.from(base64, 'base64');
        await sock.sendMessage(from, {
          image: imageBuffer,
          caption: MESSAGES.imagine.caption
        });
      } catch (err) {
        await sock.sendMessage(from, { text: formatError(err, 'Error generating image') });
      }
    }
  },
  {
    name: 'gemini',
    aliases: ['gpt', 'ai', 'ask'],
    description: 'Ask anything using Gemini AI.',
    category: 'AI',
    execute: async ({ sock, from, text, msg }) => {
      if (!text) {
        return sock.sendMessage(from, { text: MESSAGES.gemini.noQuestion });
      }

      const prompt = text.trim();

      try {
        const response = await callGeminiAPI(prompt);
        await sock.sendMessage(from, {
          text: response || MESSAGES.gemini.noResponse
        });
      } catch (err) {
        console.error('AI API Error:', err.message);
        await sock.sendMessage(from, { text: MESSAGES.gemini.error });
      }
    }
  },
  {
    name: 'llama',
    aliases: ['ilama'],
    description: 'Ask LLaMA AI a question or prompt.',
    category: 'AI',
    execute: async ({ sock, from, text, msg }) => {
      if (!text) {
        return sock.sendMessage(from, { text: MESSAGES.llama.noQuestion });
      }

      const prompt = text;

      try {
        const response = await callLlamaAPI(prompt);
        if (!response) {
          return sock.sendMessage(from, { text: MESSAGES.llama.noResponse });
        }

        await sock.sendMessage(from, {
          text: `*LLaMA says:*\n\n${response}`
        });
      } catch (error) {
        console.error('LLaMA API Error:', error);
        sock.sendMessage(from, { text: MESSAGES.llama.error });
      }
    }
  },
  {
    name: 'jokes',
    aliases: [],
    description: 'Get a random joke.',
    category: 'Fun',
    execute: async ({ sock, from, text, msg }) => {
      try {
        const joke = await getRandomJoke();
        await sock.sendMessage(from, { text: joke });
      } catch (error) {
        console.error('Error fetching joke:', error.message);
        await sock.sendMessage(from, { text: MESSAGES.jokes.error });
      }
    }
  },
  {
    name: 'advice',
    aliases: [],
    description: 'Get a random piece of advice.',
    category: 'Fun',
    execute: async ({ sock, from, text, msg }) => {
      try {
        const advice = await getRandomAdvice();
        await sock.sendMessage(from, {
          text: `*Here is an advice for you:* \n${advice}`
        });
      } catch (error) {
        console.error('Error:', error.message || 'An error occurred');
        await sock.sendMessage(from, { text: MESSAGES.advice.error });
      }
    }
  },
  {
    name: 'trivia',
    aliases: [],
    description: 'Get a random trivia question.',
    category: 'Fun',
    execute: async ({ sock, from, text, msg }) => {
      try {
        const trivia = await getRandomTrivia();
        const question = trivia.question;
        const correctAnswer = trivia.correct_answer;
        const allAnswers = [...trivia.incorrect_answers, correctAnswer].sort();

        const answers = allAnswers.map((ans, i) => `${i + 1}. ${ans}`).join('\n');

        await sock.sendMessage(from, {
          text: `🤔 *Trivia Time!*\n\n${question}\n\n${answers}\n\n_I'll reveal the correct answer in 10 seconds..._`
        });

        await delay(MESSAGES.trivia.revealDelay);
        await sock.sendMessage(from, {
          text: `✅ *Correct Answer:* ${correctAnswer}`
        });
      } catch (error) {
        console.error('Trivia Error:', error.message);
        await sock.sendMessage(from, { text: MESSAGES.trivia.error });
      }
    }
  },
  {
    name: 'inspire',
    aliases: [],
    description: 'Get an inspirational quote.',
    category: 'General',
    execute: async ({ sock, from, text, msg }) => {
      try {
        const quote = await getRandomQuote();
        await sock.sendMessage(from, {
          text: `✨ *Inspirational Quote:*\n"${quote.text}"\n— ${quote.author || "Unknown"}`
        });
      } catch (error) {
        console.error('Inspire Error:', error.message);
        await sock.sendMessage(from, { text: MESSAGES.inspire.error });
      }
    }
  },
  {
    name: 'pair',
    description: 'Generates a pairing code for a phone number.',
    category: 'General',
    execute: async ({ sock, from, text, msg }) => {
      if (!text) {
        return sock.sendMessage(from, { text: MESSAGES.pair.usage });
      }

      const number = text.trim().replace(/\D/g, '');
      if (!isValidPhoneNumber(number)) {
        return sock.sendMessage(from, { text: MESSAGES.pair.invalidNumber });
      }

      const formattedNumber = formatPhoneNumber(number);

      try {
        await sock.sendMessage(from, {
          text: MESSAGES.pair.generating.replace('{number}', formattedNumber)
        });

        const code = await generatePairCode(number);

        if (!code) {
          return sock.sendMessage(from, { text: MESSAGES.pair.noCode });
        }

        await sock.sendMessage(from, {
          text: `📱 *Pairing Code for ${formattedNumber}*`,
          footer: 'Click the button below to copy the code',
          buttons: [
            {
              buttonId: 'copy',
              buttonText: { displayText: '📋 Copy Code' },
              type: 1
            }
          ],
          headerType: 1
        });

        await sock.sendMessage(from, { text: `\`\`\`${code}\`\`\`` });
      } catch (error) {
        console.error('Pairing Code Error:', error);

        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          await sock.sendMessage(from, { text: MESSAGES.pair.timeout });
        } else {
          await sock.sendMessage(from, { text: MESSAGES.pair.error });
        }
      }
    }
  },
  {
    name: 'best-wallp',
    aliases: ['bestwal', 'best', 'bw'],
    description: 'Sends a high-quality random wallpaper.',
    category: 'FLASH PICS',
    execute: async ({ sock, from, text, msg }) => {
      try {
        const url = await getRandomWallpaper();
        if (!url) {
          return sock.sendMessage(from, { text: MESSAGES.wallpaper.error });
        }
        await sock.sendMessage(from, {
          image: { url },
          caption: MESSAGES.wallpaper.caption
        });
      } catch (error) {
        console.error('Wallpaper Error:', error);
        await sock.sendMessage(from, { text: "An error occurred while fetching wallpaper." });
      }
    }
  },
  {
    name: 'random',
    aliases: [],
    description: 'Sends a random wallpaper from Unsplash.',
    category: 'FLASH PICS',
    execute: async ({ sock, from, text, msg }) => {
      try {
        const url = await getRandomWallpaper();
        if (!url) {
          return sock.sendMessage(from, { text: MESSAGES.wallpaper.error });
        }
        await sock.sendMessage(from, {
          image: { url },
          caption: MESSAGES.wallpaper.caption
        });
      } catch (error) {
        console.error('Random Wallpaper Error:', error);
        await sock.sendMessage(from, { text: "An error occurred while fetching random wallpaper." });
      }
    }
  }
];
