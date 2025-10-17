import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  const priceFeed = await ethers.getContractAt("MockPriceFeed", addresses.priceFeed);
  
  console.log("🎯 Advanced Trading Scenarios Test");
  console.log("==================================");
  
  // Scenario 1: Price crash to test holding behavior
  console.log("\n📉 SCENARIO 1: Market Crash - Price drops to $1500");
  await priceFeed.setPrice(ethers.parseUnits("1500", 18));
  console.log("Price set to $1500 - Agent should HOLD");
  await wait(25);
  
  // Scenario 2: Bull run - gradual price increase
  console.log("\n🚀 SCENARIO 2: Bull Run - Price rises to $2800");
  await priceFeed.setPrice(ethers.parseUnits("2800", 18));
  console.log("Price set to $2800 - Agent should continue SWAPPING");
  await wait(25);
  
  // Scenario 3: Extreme volatility
  console.log("\n⚡ SCENARIO 3: Extreme Volatility");
  const prices = [3000, 1800, 2500, 2200, 2600];
  
  for (const price of prices) {
    console.log(`Setting price to $${price}...`);
    await priceFeed.setPrice(ethers.parseUnits(price.toString(), 18));
    await wait(15);
  }
  
  // Scenario 4: Return to neutral
  console.log("\n🔄 SCENARIO 4: Return to stable price");
  await priceFeed.setPrice(ethers.parseUnits("2000", 18));
  console.log("Price set to $2000 - Agent should HOLD again");
  
  console.log("\n✅ Advanced trading scenarios complete!");
  console.log("Monitor the agent controller output to see trading decisions.");
}

async function wait(seconds) {
  console.log(`⏳ Waiting ${seconds} seconds for agent to process...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});