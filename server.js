import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Use model from .env or fallback to default
const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('✅ HealthMate backend is running with Groq');
});

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    console.log('Received message from frontend:', userMessage);

    const groqResponse = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful and trustworthy health assistant. Only respond to health-related questions.',
          },
          {
            role: 'user',
            content: userMessage,
          },
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

// ✅ Optional: test Groq on startup
const testGroq = async () => {
  try {
    console.log('🔍 Running Groq test...');
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'user', content: 'I have a sore throat' },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
      }
    );
    console.log('✅ Groq test response:', response.data.choices?.[0]?.message?.content);
  } catch (error) {
    console.error('❌ Groq test error:', error.response?.data || error.message || error);
  }
};

testGroq();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ HealthMate backend running on port ${PORT}`);
});
