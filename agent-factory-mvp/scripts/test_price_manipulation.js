import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  // Load deployed addresses
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  
  // Get signer
  const [signer] = await ethers.getSigners();
  console.log("Testing with:", signer.address);
  
  // Connect to price feed
  const priceFeed = await ethers.getContractAt("MockPriceFeed", addresses.priceFeed);
  
  // Check current price
  const currentPrice = await priceFeed.getPrice();
  console.log(`Current price: $${ethers.formatUnits(currentPrice, 18)}`);
  
  // Test 1: Set price to $2200 (should trigger swap)
  console.log("\n🔥 Setting price to $2200 (should trigger swap)...");
  const newPrice = ethers.parseUnits("2200", 18);
  await priceFeed.setPrice(newPrice);
  console.log(`Price updated to: $${ethers.formatUnits(newPrice, 18)}`);
  
  // Wait a bit for the agent to pick up the change
  console.log("⏳ Waiting 25 seconds for agent to process...");
  await new Promise(resolve => setTimeout(resolve, 25000));
  
  // Test 2: Set price back to $1800 (should hold)
  console.log("\n📉 Setting price to $1800 (should hold)...");
  const lowPrice = ethers.parseUnits("1800", 18);
  await priceFeed.setPrice(lowPrice);
  console.log(`Price updated to: $${ethers.formatUnits(lowPrice, 18)}`);
  
  console.log("⏳ Waiting 25 seconds for agent to process...");
  await new Promise(resolve => setTimeout(resolve, 25000));
  
  // Test 3: Set price to $2500 (should trigger another swap if USDC available)
  console.log("\n🚀 Setting price to $2500 (should trigger another swap)...");
  const highPrice = ethers.parseUnits("2500", 18);
  await priceFeed.setPrice(highPrice);
  console.log(`Price updated to: $${ethers.formatUnits(highPrice, 18)}`);
  
  console.log("✅ Price manipulation test complete!");
  console.log("Monitor the agent controller output to see trading decisions.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});