import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { ethers, Contract } from "ethers";
import { queryDecentralizedAI } from "../../bridge/aethelred-integration.js";

dotenv.config();

export class EnhancedAgentController {
  constructor(config = {}) {
    this.config = {
      rpc: config.rpc || "http://127.0.0.1:8545",
      useAethelred: config.useAethelred !== false,
      fallbackToDeepSeek: config.fallbackToDeepSeek !== false,
      deepSeekApiKey: config.deepSeekApiKey || process.env.DEEPSEEK_API_KEY,
      mintFee: ethers.parseEther("0.01"),
      ...config
    };

    // Load ABIs
    this.abis = {};
    this.artifactPaths = {
      AgentFactory: "./artifacts/contracts/AgentFactory.sol/AgentFactory.json",
      AgentWallet: "./artifacts/contracts/AgentWallet.sol/AgentWallet.json", 
      MockPriceFeed: "./artifacts/contracts/MockPriceFeed.sol/MockPriceFeed.json",
      MockERC20: "./artifacts/contracts/MockERC20.sol/MockERC20.json"
    };

    this.loadABIs();
  }

  loadABIs() {
    for (const [name, artifactPath] of Object.entries(this.artifactPaths)) {
      try {
        const fullPath = path.resolve(process.cwd(), "agent-factory-mvp", artifactPath);
        const artifact = JSON.parse(fs.readFileSync(fullPath, "utf8"));
        this.abis[name] = artifact.abi;
      } catch (error) {
        console.warn(`⚠️ Could not load ABI for ${name}:`, error.message);
        this.abis[name] = []; // Fallback to empty ABI
      }
    }
  }

  getContract(address, contractName, signerOrProvider) {
    return new Contract(address, this.abis[contractName] || [], signerOrProvider);
  }

  async makeDecision(marketData) {
    console.log(`\n🧠 [AI] Making decision for ${marketData.symbol} at ${marketData.price}`);
    
    try {
      // Use the integrated Aethelred bridge for AI decisions
      const aiResponse = await queryDecentralizedAI(marketData, {
        useAethelred: this.config.useAethelred,
        fallbackToDeepSeek: this.config.fallbackToDeepSeek,
        deepSeekApiKey: this.config.deepSeekApiKey,
        timeout: 10000
      });

      console.log(`✅ [AI] Decision from ${aiResponse.source}:`, aiResponse.action || 'hold');
      
      if (aiResponse.reasoning) {
        console.log(`💭 [AI] Reasoning: ${aiResponse.reasoning}`);
      }

      return {
        action: aiResponse.action || 'hold',
        amount: aiResponse.amount || '0',
        condition: aiResponse.condition || '',
        confidence: aiResponse.confidence || 0.5,
        reasoning: aiResponse.reasoning || 'No specific reasoning provided',
        source: aiResponse.source,
        verified: aiResponse.verified || false,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error(`❌ [AI] Decision error:`, error.message);
      
      // Fallback to simple rule-based logic
      return {
        action: 'hold',
        amount: '0',
        condition: '',
        confidence: 0.1,
        reasoning: 'Fallback to hold due to AI service error',
        source: 'fallback',
        verified: false,
        timestamp: Date.now()
      };
    }
  }

  async simulateTrading(marketDataArray) {
    const results = [];
    
    for (const marketData of marketDataArray) {
      const decision = await this.makeDecision(marketData);
      results.push({
        marketData,
        decision,
        timestamp: Date.now()
      });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  async getOnChainAddresses() {
    // Mock addresses for testing - in production these would come from deployment
    return {
      factoryAddr: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      priceFeedAddr: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512", 
      usdcAddr: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    };
  }

  async checkAgentStatus() {
    try {
      const provider = new ethers.JsonRpcProvider(this.config.rpc);
      const { factoryAddr } = await this.getOnChainAddresses();
      const factory = this.getContract(factoryAddr, "AgentFactory", provider);
      
      const walletAddr = await factory.walletOf(0);
      return {
        exists: walletAddr !== ethers.ZeroAddress,
        walletAddress: walletAddr
      };
    } catch (error) {
      console.warn("⚠️ Could not check agent status:", error.message);
      return { exists: false, walletAddress: ethers.ZeroAddress };
    }
  }
}