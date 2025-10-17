import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  
  // Get contract ABIs
  const factoryAbi = JSON.parse(fs.readFileSync("artifacts/contracts/AgentFactory.sol/AgentFactory.json", "utf8")).abi;
  const usdcAbi = JSON.parse(fs.readFileSync("artifacts/contracts/MockERC20.sol/MockERC20.json", "utf8")).abi;
  const wethAbi = JSON.parse(fs.readFileSync("artifacts/contracts/MockERC20.sol/MockERC20.json", "utf8")).abi;
  const priceFeedAbi = JSON.parse(fs.readFileSync("artifacts/contracts/MockPriceFeed.sol/MockPriceFeed.json", "utf8")).abi;
  
  // Get contracts
  const factory = new ethers.Contract(addresses.factory, factoryAbi, deployer);
  const usdc = new ethers.Contract(addresses.usdc, usdcAbi, deployer);
  const weth = new ethers.Contract(addresses.weth, wethAbi, deployer);
  const priceFeed = new ethers.Contract(addresses.priceFeed, priceFeedAbi, deployer);
  
  // Get agent wallet address
  const walletAddr = await factory.walletOf(0);
  
  if (walletAddr === ethers.ZeroAddress) {
    console.log("❌ No agent minted yet");
    return;
  }
  
  // Get balances and price
  const usdcBalance = await usdc.balanceOf(walletAddr);
  const wethBalance = await weth.balanceOf(walletAddr);
  const currentPrice = await priceFeed.getPrice();
  
  console.log("\n🤖 AGENT MONITORING DASHBOARD");
  console.log("================================");
  console.log(`Agent Wallet: ${walletAddr}`);
  console.log(`USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
  console.log(`WETH Balance: ${ethers.formatUnits(wethBalance, 18)} WETH`);
  console.log(`Current WETH Price: $${ethers.formatUnits(currentPrice, 18)}`);
  
  // Calculate portfolio value
  const usdcValue = parseFloat(ethers.formatUnits(usdcBalance, 6));
  const wethValue = parseFloat(ethers.formatUnits(wethBalance, 18)) * parseFloat(ethers.formatUnits(currentPrice, 18));
  const totalValue = usdcValue + wethValue;
  
  console.log(`Portfolio Value: $${totalValue.toFixed(2)} USD`);
  console.log(`- USDC: $${usdcValue.toFixed(2)} (${((usdcValue/totalValue)*100).toFixed(1)}%)`);
  console.log(`- WETH: $${wethValue.toFixed(2)} (${((wethValue/totalValue)*100).toFixed(1)}%)`);
  
  if (parseFloat(ethers.formatUnits(currentPrice, 18)) > 2100) {
    console.log("🚀 Trading Signal: PRICE > $2100 - Agent should SWAP");
  } else {
    console.log("📉 Trading Signal: PRICE ≤ $2100 - Agent should HOLD");
  }
  console.log("================================\n");
}

// Run monitoring function repeatedly
async function startMonitoring() {
  console.log("🔄 Starting continuous monitoring...\n");
  
  setInterval(async () => {
    try {
      await main();
    } catch (error) {
      console.error("Monitor error:", error.message);
    }
  }, 10000); // Check every 10 seconds
}

if (process.argv.includes('--continuous')) {
  startMonitoring().catch((err) => { console.error(err); process.exitCode = 1; });
} else {
  main().catch((err) => { console.error(err); process.exitCode = 1; });
}