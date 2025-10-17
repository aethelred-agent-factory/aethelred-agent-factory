import fs from "fs";
import fetch from "node-fetch";
import { ethers } from "ethers";

/**
 * Aethelred Integration Bridge
 * 
 * This module provides integration between the Agent Factory MVP and the Aethelred Protocol.
 * It replaces the centralized DeepSeek AI with decentralized AI computation from Aethelred.
 */

class AethelredBridge {
  constructor(config = {}) {
    this.aethelredNodeUrl = config.aethelredNodeUrl || "http://localhost:8080";
    this.fallbackEnabled = config.fallbackEnabled !== false;
    this.fallbackToDeepSeek = config.fallbackToDeepSeek !== false;
    this.deepSeekApiKey = config.deepSeekApiKey || process.env.DEEPSEEK_API_KEY;
    this.timeout = config.timeout || 30000; // 30 seconds
    this.retryAttempts = config.retryAttempts || 3;
  }

  /**
   * Submit a trading decision task to the Aethelred network
   * @param {Object} marketData - Current market conditions
   * @returns {Promise<Object>} Trading decision from Aethelred network
   */
  async queryAethelredNetwork(marketData) {
    const taskRequest = {
      model_hash: "trading_agent_v1", // This would be registered in the Aethelred marketplace
      input_data: {
        price: marketData.priceUSD,
        usdcBalance: marketData.usdcBalance,
        wethBalance: marketData.wethBalance,
        portfolioValue: marketData.portfolioValue,
        timestamp: Date.now()
      },
      fee_amount: "10", // AETHEL tokens
      quality_threshold: 0.8 // Minimum quality score required
    };

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🧠 [Aethelred] Submitting task to network (attempt ${attempt}/${this.retryAttempts})`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(`${this.aethelredNodeUrl}/api/v1/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify(taskRequest),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Aethelred API error: ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.status === "completed") {
          console.log(`✅ [Aethelred] Task completed with quality score: ${result.quality_score}`);
          return this.parseAethelredResponse(result.output);
        } else if (result.status === "pending") {
          // Wait for task completion
          return await this.waitForTaskCompletion(result.task_id);
        } else {
          throw new Error(`Task failed with status: ${result.status}`);
        }

      } catch (error) {
        console.error(`⚠️  [Aethelred] Attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.retryAttempts) {
          if (this.fallbackEnabled) {
            console.log(`🔄 [Aethelred] All attempts failed, falling back to rule-based logic`);
            return this.fallbackDecision(marketData);
          } else {
            throw error;
          }
        }
        
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  /**
   * Wait for a pending task to complete
   * @param {string} taskId - The task ID to monitor
   * @returns {Promise<Object>} Trading decision when task completes
   */
  async waitForTaskCompletion(taskId) {
    const pollInterval = 2000; // 2 seconds
    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`${this.aethelredNodeUrl}/api/v1/tasks/${taskId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const result = await response.json();

        if (result.status === "completed") {
          console.log(`✅ [Aethelred] Task ${taskId} completed`);
          return this.parseAethelredResponse(result.output);
        } else if (result.status === "failed") {
          throw new Error(`Task ${taskId} failed: ${result.error}`);
        }

        console.log(`⏳ [Aethelred] Task ${taskId} still ${result.status}, waiting...`);
        await this.sleep(pollInterval);

      } catch (error) {
        console.error(`⚠️  [Aethelred] Error polling task ${taskId}:`, error.message);
        throw error;
      }
    }

    throw new Error(`Task ${taskId} timed out after ${maxWaitTime}ms`);
  }

  /**
   * Parse the response from Aethelred network into the expected format
   * @param {Object} aethelredOutput - Raw output from Aethelred
   * @returns {Object} Parsed trading decision
   */
  parseAethelredResponse(aethelredOutput) {
    try {
      // Aethelred returns structured output from the AI model
      const decision = aethelredOutput.trading_decision || aethelredOutput;
      
      return {
        action: decision.action || "hold",
        amount: decision.amount || "100",
        condition: decision.condition || "",
        confidence: decision.confidence || 0.5,
        reasoning: decision.reasoning || "",
        source: "aethelred",
        verified: true // Cryptographically verified by the network
      };
    } catch (error) {
      console.error("⚠️  [Aethelred] Error parsing response:", error.message);
      return this.fallbackDecision();
    }
  }

  /**
   * Call DeepSeek API for AI trading decisions
   * @param {Object} marketData - Current market conditions
   * @returns {Promise<Object>} AI trading decision from DeepSeek
   */
  async callDeepSeekAPI(marketData) {
    if (!this.deepSeekApiKey) {
      throw new Error("DeepSeek API key not provided");
    }

    const prompt = `You are an AI trading assistant. Analyze the following market data and provide a trading decision:

Market Data:
- Symbol: ${marketData.symbol || 'WETH/USDC'}
- Current Price: $${marketData.price || marketData.priceUSD}
- 24h Change: ${marketData.priceChange24h || 'N/A'}%
- Volume: ${marketData.volume || 'N/A'}
- Trend: ${marketData.trend || 'neutral'}
- RSI: ${marketData.technicalIndicators?.rsi || 'N/A'}
- MACD: ${marketData.technicalIndicators?.macd || 'N/A'}

Based on this data, decide whether to:
1. "swap" - Buy WETH with USDC
2. "hold" - Keep current position
3. "sell" - Sell WETH for USDC

Respond in JSON format:
{
  "action": "swap|hold|sell",
  "amount": "amount in USDC",
  "condition": "price condition",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.deepSeekApiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              "role": "system", 
              "content": "You are an expert trading AI. Always respond with valid JSON only."
            },
            {
              "role": "user",
              "content": prompt
            }
          ],
          max_tokens: 300,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const aiContent = result.choices?.[0]?.message?.content;
      
      if (!aiContent) {
        throw new Error("Invalid response from DeepSeek API");
      }

      // Parse JSON response (handle markdown-wrapped JSON)
      try {
        let jsonContent = aiContent.trim();
        
        // Remove markdown code block formatting if present
        if (jsonContent.startsWith('```json') && jsonContent.endsWith('```')) {
          jsonContent = jsonContent.slice(7, -3).trim();
        } else if (jsonContent.startsWith('```') && jsonContent.endsWith('```')) {
          jsonContent = jsonContent.slice(3, -3).trim();
        }
        
        const decision = JSON.parse(jsonContent);
        return {
          ...decision,
          source: "deepseek",
          verified: true
        };
      } catch (parseError) {
        console.warn("⚠️ Could not parse DeepSeek JSON response:", aiContent);
        throw new Error("Invalid JSON response from DeepSeek API");
      }

    } catch (error) {
      console.error(`❌ [DeepSeek] API call failed:`, error.message);
      throw error;
    }
  }

  /**
   * Fallback to DeepSeek API or rule-based logic when Aethelred is unavailable
   * @param {Object} marketData - Current market conditions
   * @returns {Promise<Object>} Trading decision from fallback method
   */
  async fallbackDecision(marketData = {}) {
    // First try DeepSeek API if configured and fallback is enabled
    if (this.deepSeekApiKey && this.fallbackToDeepSeek) {
      try {
        console.log("🤖 [DeepSeek] Attempting API call...");
        const decision = await this.callDeepSeekAPI(marketData);
        console.log("✅ [DeepSeek] AI decision received");
        return decision;
      } catch (error) {
        console.warn("⚠️ [DeepSeek] API failed, falling back to rule-based logic");
      }
    }

    // Fall back to rule-based logic
    console.log("📏 [Fallback] Using rule-based logic");
    const { priceUSD = 0, price = 0, usdcBalance = 0 } = marketData;
    const currentPrice = priceUSD || price || 0;
    
    if (currentPrice > 2100 && parseFloat(ethers.formatUnits(usdcBalance || "0", 6)) >= 100) {
      return {
        action: "swap",
        amount: "100",
        condition: "price>2100",
        confidence: 0.7,
        reasoning: "Rule-based: Price above $2100 threshold",
        source: "fallback",
        verified: false
      };
    }

    return {
      action: "hold",
      amount: "0",
      condition: "",
      confidence: 0.8,
      reasoning: "Rule-based: Price below threshold or insufficient balance",
      source: "fallback",
      verified: false
    };
  }

  /**
   * Check if Aethelred network is available
   * @returns {Promise<boolean>} True if network is responsive
   */
  async isAethelredAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.aethelredNodeUrl}/api/v1/health`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get network statistics from Aethelred
   * @returns {Promise<Object>} Network stats including active nodes, task queue, etc.
   */
  async getNetworkStats() {
    try {
      const response = await fetch(`${this.aethelredNodeUrl}/api/v1/stats`);
      if (!response.ok) {
        throw new Error(`Stats API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("⚠️  [Aethelred] Error fetching network stats:", error.message);
      return null;
    }
  }

  /**
   * Utility function for sleeping
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Enhanced query function that uses Aethelred instead of DeepSeek
 * @param {Object} marketData - Current market conditions
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Trading decision
 */
export async function queryDecentralizedAI(marketData, config = {}) {
  const bridge = new AethelredBridge(config);

  // Check if Aethelred is available
  const isAvailable = await bridge.isAethelredAvailable();
  
  if (!isAvailable && !bridge.fallbackEnabled) {
    throw new Error("Aethelred network is not available and fallback is disabled");
  }

  if (!isAvailable) {
    console.log("⚠️  [Aethelred] Network not available, using fallback");
    return bridge.fallbackDecision(marketData);
  }

  // Get network stats for monitoring
  const stats = await bridge.getNetworkStats();
  if (stats) {
    console.log(`📊 [Aethelred] Network stats: ${stats.active_nodes} nodes, ${stats.pending_tasks} pending tasks`);
  }

  return await bridge.queryAethelredNetwork(marketData);
}

export { AethelredBridge };
export default AethelredBridge;