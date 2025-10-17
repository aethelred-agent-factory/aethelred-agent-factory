import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { ethers, Contract } from "ethers";
import { queryDecentralizedAI } from "../../bridge/aethelred-integration.js";

dotenv.config();

// Configuration
const USE_AETHELRED = process.env.USE_AETHELRED !== "false"; // Default to true
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const RPC = "http://127.0.0.1:8545";
const INTERVAL_MS = 20000;
const mintFee = ethers.parseEther("0.01");

console.log(`🚀 Starting Enhanced Agent Controller`);
console.log(`📡 Aethelred Integration: ${USE_AETHELRED ? "ENABLED" : "DISABLED"}`);
console.log(`🔑 DeepSeek Fallback: ${DEEPSEEK_API_KEY ? "AVAILABLE" : "NOT AVAILABLE"}`);

// Load ABIs once and store them
const ABIS = {};
const ARTIFACT_PATHS = {
  AgentFactory: "artifacts/contracts/AgentFactory.sol/AgentFactory.json",
  AgentWallet: "artifacts/contracts/AgentWallet.sol/AgentWallet.json",
  MockPriceFeed: "artifacts/contracts/MockPriceFeed.sol/MockPriceFeed.json",
  MockRouter: "artifacts/contracts/MockRouter.sol/MockRouter.json",
  MockERC20: "artifacts/contracts/MockERC20.sol/MockERC20.json",
};

for (const [name, artifactPath] of Object.entries(ARTIFACT_PATHS)) {
  try {
    ABIS[name] = JSON.parse(fs.readFileSync(artifactPath, "utf8")).abi;
  } catch (e) {
    console.error(`Error loading ABI for ${name}: ${e.message}`);
    process.exit(1);
  }
}

// Global provider and signer
const provider = new ethers.JsonRpcProvider(RPC);

// Legacy DeepSeek integration (fallback)
async function queryDeepSeek(promptJSON) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not available");
  }

  const url = "https://api.deepseek.com/chat/completions";
  const body = {
    model: "deepseek-chat",
    messages: [
      {
        role: "system", 
        content: "You are a trading agent. Respond only with valid JSON in the format: {\"action\": \"swap\", \"amount\": \"100\", \"condition\": \"price>2100\"} or {\"action\": \"hold\"}. No other text."
      },
      {
        role: "user",
        content: `Market data: ${promptJSON}. Should I swap USDC for WETH if price > 2100?`
      }
    ],
    max_tokens: 150,
    temperature: 0.1
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`DeepSeek API error: ${resp.status} - ${text}`);
  }

  const data = await resp.json();
  let output = data.choices?.[0]?.message?.content;

  if (output) {
    try {
      const match = output.match(/(\\{[\\s\\S]*\\})/);
      return {
        ...JSON.parse(match ? match[1] : output),
        source: "deepseek",
        verified: false
      };
    } catch (e) {
      console.log("Raw DeepSeek output:", output);
      if (output.toLowerCase().includes("swap") && output.toLowerCase().includes("2100")) {
        return { action: "swap", amount: "100", condition: "price>2100", source: "deepseek", verified: false };
      }
      return { action: "hold", source: "deepseek", verified: false };
    }
  }
  return { action: "hold", source: "deepseek", verified: false };
}

// Enhanced AI query function that chooses between Aethelred and DeepSeek
async function queryAI(marketData) {
  if (USE_AETHELRED) {
    try {
      const decision = await queryDecentralizedAI(marketData, {
        aethelredNodeUrl: process.env.AETHELRED_NODE_URL || "http://localhost:8080",
        fallbackEnabled: true,
        timeout: 30000,
        retryAttempts: 2
      });

      // If we get any response from Aethelred (verified or fallback), use it
      if (decision) {
        if (decision.verified) {
          console.log(`✅ [Aethelred] Verified decision received: ${decision.action}`);
        } else {
          console.log(`⚠️  [Aethelred] Fallback decision received: ${decision.action}`);
        }
        return decision;
      }

      console.log(`❌ [Aethelred] No response, trying DeepSeek fallback`);
    } catch (error) {
      console.error(`❌ [Aethelred] Error:`, error.message);
      console.log(`🔄 [Fallback] Attempting DeepSeek...`);
    }
  }

  // Fallback to DeepSeek or rule-based logic
  if (DEEPSEEK_API_KEY) {
    try {
      const decision = await queryDeepSeek(JSON.stringify(marketData));
      console.log(`🧠 [DeepSeek] Decision: ${decision.action}`);
      return decision;
    } catch (error) {
      console.error(`❌ [DeepSeek] Error:`, error.message);
    }
  }

  // Final fallback to rule-based logic
  console.log(`📊 [Rule-Based] Using simple trading rules`);
  const { priceUSD, usdcBalance } = marketData;
  
  if (priceUSD > 2100 && parseFloat(ethers.formatUnits(usdcBalance || "0", 6)) >= 100) {
    return {
      action: "swap",
      amount: "100",
      condition: "price>2100",
      confidence: 0.7,
      reasoning: "Rule-based: Price above $2100 threshold",
      source: "rule-based",
      verified: false
    };
  }

  return {
    action: "hold",
    amount: "0",
    condition: "",
    confidence: 0.8,
    reasoning: "Rule-based: Price below threshold or insufficient balance",
    source: "rule-based",
    verified: false
  };
}

// Centralized contract interaction function
function getContract(address, name, signerOrProvider) {
  return new Contract(address, ABIS[name], signerOrProvider);
}

async function mainLoop() {
  const signer = await provider.getSigner(0);
  const owner = await signer.getAddress();
  
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  const { factory: factoryAddr, usdc: usdcAddr, router: routerAddr, priceFeed: priceFeedAddr } = addresses;

  const factory = getContract(factoryAddr, "AgentFactory", signer);
  const priceFeed = getContract(priceFeedAddr, "MockPriceFeed", provider);
  const usdc = getContract(usdcAddr, "MockERC20", signer);

  // --- Initial Setup/Checks ---

  // 1. Ensure Agent is Minted (Agent ID 0 is the first minted agent)
  let walletAddr = await factory.walletOf(0);
  if (walletAddr === ethers.ZeroAddress) {
    console.log("📱 [Setup] Minting initial agent (ID 0)...");
    try {
      const tx = await factory.createAgent({ value: mintFee });
      await tx.wait();
      walletAddr = await factory.walletOf(0);
      console.log(`✅ [Setup] Minted agent. Wallet: ${walletAddr}`);
    } catch (e) {
      console.warn("⚠️  [Setup] Mint failed or already minted");
      walletAddr = await factory.walletOf(0);
      if (walletAddr === ethers.ZeroAddress) {
        console.error("❌ [Setup] Fatal - Could not determine agent wallet address.");
        process.exit(1);
      }
    }
  } else {
    console.log(`✅ [Setup] Agent wallet found at: ${walletAddr}`);
  }

  // 2. Configure Wallet
  const wallet = getContract(walletAddr, "AgentWallet", signer);
  const isTargetAllowed = await wallet.allowedTargets(routerAddr);
  if (!isTargetAllowed) {
    console.log("⚙️  [Setup] Setting router as allowed target on agent wallet...");
    try {
      const txSetTarget = await wallet.setAllowedTarget(routerAddr, true);
      await txSetTarget.wait();
      console.log("✅ [Setup] Router target set.");
    } catch (e) {
      console.warn("⚠️  [Setup] Failed to set allowed target (might be set already).");
    }
  }

  // 3. Fund Agent Wallet
  const fundAmountUSDC = ethers.parseUnits("10000", 6);
  const currentWalletBal = await usdc.balanceOf(walletAddr);
  if (currentWalletBal < fundAmountUSDC) {
    console.log(`💰 [Setup] Funding agent wallet with ${ethers.formatUnits(fundAmountUSDC, 6)} USDC...`);
    await usdc.transfer(walletAddr, fundAmountUSDC);
    console.log("✅ [Setup] Agent wallet funded.");
  }

  // --- Enhanced Controller Loop ---

  console.log(`\n🔄 Starting enhanced controller loop (runs every ${INTERVAL_MS / 1000}s).`);
  console.log(`🌐 Integration Mode: ${USE_AETHELRED ? "Aethelred + Fallbacks" : "DeepSeek + Rule-based"}`);

  let tickCount = 0;
  let successfulTrades = 0;
  let failedTrades = 0;

  setInterval(async () => {
    tickCount++;
    console.log(`\n--- TICK ${tickCount} ---`);
    
    try {
      const currentPrice = await priceFeed.getPrice();
      const bal = await usdc.balanceOf(walletAddr);
      const wethBal = await getContract(addresses.weth, "MockERC20", provider).balanceOf(walletAddr);
      
      const priceUSD = parseFloat(ethers.formatUnits(currentPrice, 18));
      const usdcAmount = parseFloat(ethers.formatUnits(bal, 6));
      const wethAmount = parseFloat(ethers.formatUnits(wethBal, 18));
      const portfolioValue = usdcAmount + (wethAmount * priceUSD);

      // Enhanced market data for AI
      const marketData = {
        wallet: walletAddr,
        usdcBalance: bal.toString(),
        wethBalance: wethBal.toString(),
        price: currentPrice.toString(),
        priceUSD: priceUSD,
        portfolioValue: portfolioValue.toFixed(2),
        usdcAmount: usdcAmount,
        wethAmount: wethAmount,
        timestamp: Date.now(),
        tickCount: tickCount,
        tradeHistory: {
          successful: successfulTrades,
          failed: failedTrades
        }
      };

      // Enhanced logging with portfolio tracking
      console.log(`🤖 [Status] Agent Trading Dashboard:`);
      console.log(`   💰 Price: $${priceUSD} WETH/USD`);
      console.log(`   📊 USDC: ${usdcAmount.toFixed(2)} | WETH: ${wethAmount.toFixed(4)}`);
      console.log(`   💼 Portfolio: $${portfolioValue.toFixed(2)} USD`);
      console.log(`   📈 Trades: ${successfulTrades} successful, ${failedTrades} failed`);

      // Query AI for trading decision
      const plan = await queryAI(marketData);
      
      // Enhanced logging for AI decision
      console.log(`🎯 [Decision] Source: ${plan.source} | Verified: ${plan.verified ? "✅" : "❌"}`);
      console.log(`   Action: ${plan.action} | Amount: ${plan.amount || "N/A"}`);
      console.log(`   Confidence: ${(plan.confidence * 100).toFixed(1)}%`);
      if (plan.reasoning) {
        console.log(`   Reasoning: ${plan.reasoning}`);
      }

      // Execute trading decision
      if (plan.action === "swap") {
        const amountToSwap = plan.amount ? ethers.parseUnits(plan.amount, 6) : ethers.parseUnits("100", 6);
        const thresholdStr = plan.condition?.includes("price>") ? plan.condition.split("price>")[1] : null;

        let conditionMet = true;
        if (thresholdStr) {
          const threshold = BigInt(ethers.parseUnits(thresholdStr, 18).toString()); 
          if (currentPrice <= threshold) {
            conditionMet = false;
            console.log(`❌ [Trade] Condition not met: Current price (${ethers.formatUnits(currentPrice, 18)}) ≤ threshold (${ethers.formatUnits(threshold, 18)})`);
          }
        }

        if (conditionMet) {
          if (bal < amountToSwap) {
            console.log(`❌ [Trade] Insufficient USDC balance (${ethers.formatUnits(bal, 6)}) to swap ${ethers.formatUnits(amountToSwap, 6)}`);
            failedTrades++;
          } else {
            try {
              const routerInterface = new ethers.Interface(ABIS.MockRouter);
              const calldata = routerInterface.encodeFunctionData("swapAForB", [walletAddr, owner, amountToSwap]);

              console.log(`🔄 [Trade] Executing swap: ${ethers.formatUnits(amountToSwap, 6)} USDC → WETH`);
              console.log(`   📡 Using ${plan.source} decision (verified: ${plan.verified})`);
              
              const execTx = await wallet.execute(routerAddr, 0, calldata);
              await execTx.wait();
              
              console.log(`✅ [Trade] Swap completed! TX: ${execTx.hash}`);
              successfulTrades++;
            } catch (error) {
              console.error(`❌ [Trade] Swap failed:`, error.message);
              failedTrades++;
            }
          }
        }
      } else {
        console.log(`💤 [Trade] Holding position based on ${plan.source} analysis`);
      }

    } catch (err) {
      console.error("\\n❌ [ERROR] Controller loop error:", err.message || err);
      failedTrades++;
    }
  }, INTERVAL_MS);
}

mainLoop().catch((e) => {
  console.error("💥 [FATAL] Controller error", e);
  process.exit(1);
});