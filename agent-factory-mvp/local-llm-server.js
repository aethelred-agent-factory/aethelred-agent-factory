import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';

const app = express();
app.use(express.json());

// Simple local LLM using a lightweight model (you can replace with Ollama or other)
class LocalLLM {
  constructor() {
    this.isReady = false;
    this.initialize();
  }

  async initialize() {
    console.log("🧠 Initializing Local LLM...");
    // For now, use simple rule-based responses
    // Later we can integrate with Ollama, llama.cpp, or other local models
    this.isReady = true;
    console.log("✅ Local LLM ready!");
  }

  async generateResponse(prompt) {
    if (!this.isReady) {
      throw new Error("LLM not ready");
    }

    // Parse the market data from the prompt
    try {
      const marketData = JSON.parse(prompt.split('Market data: ')[1].split('. Should')[0]);
      const priceUSD = marketData.priceUSD;
      const usdcBalance = parseFloat(marketData.usdcBalance) / 1e6; // Convert from wei to tokens
      
      console.log(`🤖 Local LLM Processing: Price=$${priceUSD}, USDC=${usdcBalance}`);
      
      // Simple trading logic (much faster than calling external API)
      if (priceUSD > 2100 && usdcBalance >= 100) {
        return {
          action: "swap",
          amount: "100", 
          condition: "price>2100",
          confidence: 0.85,
          reasoning: `Price $${priceUSD} > $2100 threshold, executing swap of 100 USDC`
        };
      } else if (priceUSD <= 2100) {
        return {
          action: "hold",
          reasoning: `Price $${priceUSD} <= $2100 threshold, holding position`
        };
      } else {
        return {
          action: "hold", 
          reasoning: `Insufficient USDC balance (${usdcBalance}) for swap`
        };
      }
    } catch (error) {
      console.error("Error parsing prompt:", error);
      return { action: "hold", reasoning: "Error parsing market data" };
    }
  }
}

const llm = new LocalLLM();

// DeepSeek-compatible API endpoint
app.post('/chat/completions', async (req, res) => {
  try {
    const { messages } = req.body;
    const userMessage = messages.find(m => m.role === 'user')?.content || '';
    
    console.log(`📨 Received request: ${userMessage.substring(0, 100)}...`);
    
    const response = await llm.generateResponse(userMessage);
    
    // Return in DeepSeek API format
    res.json({
      choices: [{
        message: {
          content: JSON.stringify(response)
        }
      }]
    });
    
    console.log(`📤 Sent response: ${JSON.stringify(response)}`);
  } catch (error) {
    console.error('LLM Error:', error);
    res.status(500).json({
      choices: [{
        message: {
          content: JSON.stringify({ action: "hold", error: error.message })
        }
      }]
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    model: 'local-trading-llm',
    ready: llm.isReady 
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Local LLM Server running on http://localhost:${PORT}`);
  console.log(`💰 Ready to process trading decisions locally!`);
  console.log(`📊 No more DeepSeek API costs! 🎉`);
});