// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.get('/', (req, res) => {
  res.send('✅ HealthMate backend is running with Groq + Mixtral');
});

app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: `You are a health-focused AI assistant named HealthMate. You only answer questions related to health, symptoms, medications, wellness, and emergencies. If asked about anything outside of health, politely decline and remind the user that you are strictly a health assistant.`,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (data.choices && data.choices[0]?.message?.content) {
      res.json({ reply: data.choices[0].message.content });
    } else {
      console.error('Groq response error:', data);
      res.status(500).json({ reply: '⚠️ Sorry, I couldn’t process that right now. Please try again later.' });
    }
  } catch (error) {
    console.error('Groq API error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
    });
    res.status(500).json({ reply: '⚠️ Sorry, I couldn’t process that right now. Please try again later.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ HealthMate backend running on port ${PORT}`);
});
