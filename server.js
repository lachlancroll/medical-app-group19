// server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('✅ PharmaConnectAI backend is running with Groq');
});

app.post('/chat', async (req, res) => {
  try {
    const { messages, userProfile } = req.body;

    const systemPrompt = `
You are PharmaConnectAI, a compassionate and knowledgeable health assistant.
Only respond to health-related questions. If asked about anything else, politely decline.
Use prior messages to understand context and guide the user toward a solution.
Ask follow-up questions when needed. Be conversational and supportive.
User profile: ${userProfile?.age ? `Age ${userProfile.age}, ` : ''}${userProfile?.gender || ''}${userProfile?.conditions ? `, Known conditions: ${userProfile.conditions.join(', ')}` : ''}.
`;

    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
      }
    );

    const reply = groqResponse.data.choices?.[0]?.message?.content;
    res.json({ reply: reply || '⚠️ No response received.' });

  } catch (error) {
    console.error('Groq error:', error.response?.data || error.message || error);
    res.status(500).json({
      reply: '⚠️ Sorry, something went wrong while processing your message. Please try again shortly.',
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ PharmaConnectAI backend running on port ${PORT}`);
});