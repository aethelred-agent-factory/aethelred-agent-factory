import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log("🧪 Starting Agent Factory Trading Test\n");
  
  const [deployer] = await ethers.getSigners();
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  
  // Get contracts
  const priceFeedAbi = JSON.parse(fs.readFileSync("artifacts/contracts/MockPriceFeed.sol/MockPriceFeed.json", "utf8")).abi;
  const factoryAbi = JSON.parse(fs.readFileSync("artifacts/contracts/AgentFactory.sol/AgentFactory.json", "utf8")).abi;
  const usdcAbi = JSON.parse(fs.readFileSync("artifacts/contracts/MockERC20.sol/MockERC20.json", "utf8")).abi;
  const wethAbi = JSON.parse(fs.readFileSync("artifacts/contracts/MockERC20.sol/MockERC20.json", "utf8")).abi;
  
  const priceFeed = new ethers.Contract(addresses.priceFeed, priceFeedAbi, deployer);
  const factory = new ethers.Contract(addresses.factory, factoryAbi, deployer);
  const usdc = new ethers.Contract(addresses.usdc, usdcAbi, deployer);
  const weth = new ethers.Contract(addresses.weth, wethAbi, deployer);
  
  const walletAddr = await factory.walletOf(0);
  
  console.log("📊 Test Scenario: Price manipulation to trigger trades");
  console.log(`Agent Wallet: ${walletAddr}\n`);
  
  // Test 1: Set price below threshold
  console.log("🔸 Test 1: Setting price to $2000 (below threshold)");
  await priceFeed.setPrice(ethers.parseUnits("2000", 18));
  
  let usdcBal = await usdc.balanceOf(walletAddr);
  let wethBal = await weth.balanceOf(walletAddr);
  console.log(`   USDC: ${ethers.formatUnits(usdcBal, 6)}, WETH: ${ethers.formatUnits(wethBal, 18)}`);
  
  console.log("   Waiting 25 seconds for controller to process...");
  await sleep(25000);
  
  // Test 2: Set price above threshold
  console.log("\n🔸 Test 2: Setting price to $2200 (above threshold)");
  await priceFeed.setPrice(ethers.parseUnits("2200", 18));
  
  usdcBal = await usdc.balanceOf(walletAddr);
  wethBal = await weth.balanceOf(walletAddr);
  console.log(`   USDC: ${ethers.formatUnits(usdcBal, 6)}, WETH: ${ethers.formatUnits(wethBal, 18)}`);
  
  console.log("   Waiting 25 seconds for controller to process...");
  await sleep(25000);
  
  // Test 3: Check final balances
  console.log("\n🔸 Test 3: Final balance check");
  usdcBal = await usdc.balanceOf(walletAddr);
  wethBal = await weth.balanceOf(walletAddr);
  const finalPrice = await priceFeed.getPrice();
  
  const portfolioValue = parseFloat(ethers.formatUnits(usdcBal, 6)) + 
                        (parseFloat(ethers.formatUnits(wethBal, 18)) * parseFloat(ethers.formatUnits(finalPrice, 18)));
  
  console.log(`   Final USDC: ${ethers.formatUnits(usdcBal, 6)}`);
  console.log(`   Final WETH: ${ethers.formatUnits(wethBal, 18)}`);
  console.log(`   Final Price: $${ethers.formatUnits(finalPrice, 18)}`);
  console.log(`   Portfolio Value: $${portfolioValue.toFixed(2)}`);
  
  if (parseFloat(ethers.formatUnits(wethBal, 18)) > 0) {
    console.log("\n✅ SUCCESS: Agent executed a swap when price was above threshold!");
  } else {
    console.log("\n❌ No swap detected. Check controller logs.");
  }
  
  console.log("\n🧪 Test completed!");
}

main().catch((err) => { console.error(err); process.exitCode = 1; });