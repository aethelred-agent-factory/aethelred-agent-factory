import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { ethers, Contract } from "ethers";

dotenv.config();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
if (!DEEPSEEK_API_KEY) {
  console.error("DEEPSEEK_API_KEY not set. Exiting.");
  process.exit(1);
}

const RPC = "http://127.0.0.1:8545";
const INTERVAL_MS = 20000;
const mintFee = ethers.parseEther("0.01"); // Constant for mint fee

// Load ABIs once and store them
const ABIS = {};
const ARTIFACT_PATHS = {
  AgentFactory: "artifacts/contracts/AgentFactory.sol/AgentFactory.json",
  AgentWallet: "artifacts/contracts/AgentWallet.sol/AgentWallet.json",
  MockPriceFeed: "artifacts/contracts/MockPriceFeed.sol/MockPriceFeed.json",
  MockRouter: "artifacts/contracts/MockRouter.sol/MockRouter.json",
  MockERC20: "artifacts/contracts/MockERC20.sol/MockERC20.json", // Added ERC20 ABI
};

for (const [name, path] of Object.entries(ARTIFACT_PATHS)) {
  try {
    ABIS[name] = JSON.parse(fs.readFileSync(path, "utf8")).abi;
  } catch (e) {
    console.error(`Error loading ABI for ${name}: ${e.message}`);
    process.exit(1);
  }
}

// Global provider and signer
const provider = new ethers.JsonRpcProvider(RPC);

// Helper to call DeepSeek with a short JSON prompt and get back action JSON
async function queryDeepSeek(promptJSON) {
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

  try {
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
        // Attempt to extract and parse the JSON response from the text
        const match = output.match(/(\{[\s\S]*\})/);
        return JSON.parse(match ? match[1] : output);
      } catch (e) {
        // Fallback: return raw output if parsing fails
        console.log("Raw DeepSeek output:", output);
        // Try to determine action from text
        if (output.toLowerCase().includes("swap") && output.toLowerCase().includes("2100")) {
          return { action: "swap", amount: "100", condition: "price>2100" };
        }
        return { action: "hold" };
      }
    }
    return { action: "hold" }; // Default safe action
  } catch (error) {
    console.error("DeepSeek fetch error:", error.message);
    // Return a default structure to avoid crashing the loop
    return { error: error.message };
  }
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
  
  // FIX: Redundant and incorrectly initialized router instance is removed.

  // --- Initial Setup/Checks ---

  // 1. Ensure Agent is Minted (Agent ID 0 is the first minted agent)
  let walletAddr = await factory.walletOf(0);
  if (walletAddr === ethers.ZeroAddress) {
    console.log("Controller: Minting initial agent (ID 0)...");
    try {
      // The script will try to mint an agent on every run until one is minted
      const tx = await factory.createAgent({ value: mintFee });
      await tx.wait();
      walletAddr = await factory.walletOf(0);
      console.log(`Controller: Minted agent. Wallet: ${walletAddr}`);
    } catch (e) {
      console.warn("Controller: Mint failed or already minted (ignoring this error for continuous running).");
      walletAddr = await factory.walletOf(0); // Re-fetch in case of race condition or prior hidden mint
      if (walletAddr === ethers.ZeroAddress) {
          console.error("Controller: Fatal - Could not determine agent wallet address.");
          process.exit(1);
      }
    }
  } else {
    console.log(`Controller: Agent wallet found at: ${walletAddr}`);
  }

  // 2. Configure Wallet
  const wallet = getContract(walletAddr, "AgentWallet", signer);
  const isTargetAllowed = await wallet.allowedTargets(routerAddr);
  if (!isTargetAllowed) {
    console.log("Controller: Setting router as allowed target on agent wallet...");
    try {
      const txSetTarget = await wallet.setAllowedTarget(routerAddr, true);
      await txSetTarget.wait();
      console.log("Router target set.");
    } catch (e) {
      console.warn("Controller: Failed to set allowed target (might be set already).");
    }
  }

  // 3. Fund Agent Wallet
  const fundAmountUSDC = ethers.parseUnits("10000", 6);
  const currentWalletBal = await usdc.balanceOf(walletAddr);
  if (currentWalletBal < fundAmountUSDC) {
      console.log(`Controller: Funding agent wallet with ${ethers.formatUnits(fundAmountUSDC, 6)} USDC...`);
      await usdc.transfer(walletAddr, fundAmountUSDC);
      console.log("Agent wallet funded.");
  }

  // --- Controller Loop ---

  console.log(`\nStarting controller loop (runs every ${INTERVAL_MS / 1000}s).`);

  setInterval(async () => {
    try {
      const currentPrice = await priceFeed.getPrice();
      const bal = await usdc.balanceOf(walletAddr);

      // Get WETH balance for portfolio tracking
      const wethBal = await getContract(addresses.weth, "MockERC20", provider).balanceOf(walletAddr);
      const priceUSD = parseFloat(ethers.formatUnits(currentPrice, 18));
      const usdcAmount = parseFloat(ethers.formatUnits(bal, 6));
      const wethAmount = parseFloat(ethers.formatUnits(wethBal, 18));
      const portfolioValue = usdcAmount + (wethAmount * priceUSD);

      // Enhanced logging with portfolio tracking
      console.log(`\n🤖 [TICK] Agent Status:`);
      console.log(`   Price: $${priceUSD} WETH/USD`);
      console.log(`   USDC: ${usdcAmount.toFixed(2)} | WETH: ${wethAmount.toFixed(4)}`);
      console.log(`   Portfolio: $${portfolioValue.toFixed(2)} USD`);

      // FIX: Update context for the AI model for consistency with the WETH/USD price feed
      const perception = {
        wallet: walletAddr,
        usdcBalance: bal.toString(),
        wethBalance: wethBal.toString(),
        price: currentPrice.toString(),
        priceUSD: priceUSD,
        portfolioValue: portfolioValue.toFixed(2),
        context: "If WETH price > $2100, swap 100 USDC -> WETH via router.swapAForB."
      };

      let plan;
      const dsResponse = await queryDeepSeek(JSON.stringify(perception));
      
      if (dsResponse.error) {
        console.log(`   ⚠️  DeepSeek API failed: ${dsResponse.error}`);
        // Fallback to simple rule-based trading
        if (priceUSD > 2100 && usdcAmount >= 100) {
          plan = { action: "swap", amount: "100", condition: "price>2100", source: "fallback" };
          console.log(`   🔄 Fallback rule: Price $${priceUSD} > $2100, executing swap`);
        } else {
          plan = { action: "hold", source: "fallback" };
          console.log(`   📊 Fallback rule: Price $${priceUSD} ≤ $2100 or insufficient balance, holding`);
        }
      } else {
        plan = dsResponse;
        console.log(`   🧠 DeepSeek decision: ${JSON.stringify(dsResponse)}`);
      }

      // Decide if plan instructs a swap
      if (plan.action === "swap") {
        const amountToSwap = plan.amount ? ethers.parseUnits(plan.amount, 6) : ethers.parseUnits("100", 6);
        // Extract threshold logic from the simple condition
        const thresholdStr = plan.condition?.includes("price>") ? plan.condition.split("price>")[1] : null;

        let conditionMet = true;
        if (thresholdStr) {
          // Parse threshold with 18 decimals for comparison with currentPrice (which is 18 decimals)
          const threshold = BigInt(ethers.parseUnits(thresholdStr, 18).toString()); 
          if (currentPrice <= threshold) {
            conditionMet = false;
            console.log(`Condition not met: Current price (${ethers.formatUnits(currentPrice, 18)}) is not > threshold (${ethers.formatUnits(threshold, 18)}). Skipping swap.`);
          }
        }

        if (conditionMet) {
            if (bal < amountToSwap) {
                console.log(`Insufficient USDC balance (${ethers.formatUnits(bal, 6)}) to swap ${ethers.formatUnits(amountToSwap, 6)}. Skipping.`);
            } else {
                // Keep this line for encoding:
                const routerInterface = new ethers.Interface(ABIS.MockRouter);
                
                // Build calldata for router.swapAForB(from, to, amount)
                const calldata = routerInterface.encodeFunctionData("swapAForB", [walletAddr, owner, amountToSwap]);

                // Call wallet.execute(target=routerAddr, value=0, data=calldata)
                console.log(`   🔄 Executing swap: ${ethers.formatUnits(amountToSwap, 6)} USDC → WETH`);
                const execTx = await wallet.execute(routerAddr, 0, calldata);
                await execTx.wait();
                console.log(`   ✅ Swap completed! TX: ${execTx.hash}`);
            }
        }
      } else if (!plan.error) {
        console.log("No actionable plan or unknown action:", plan);
      }
    } catch (err) {
      console.error("\n[ERROR] Controller loop error:", err.message || err);
    }
  }, INTERVAL_MS);
}

mainLoop().catch((e) => {
  console.error("Fatal controller error", e);
  process.exit(1);
});
