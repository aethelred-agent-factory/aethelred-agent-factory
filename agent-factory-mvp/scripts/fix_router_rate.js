import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  
  const router = await ethers.getContractAt("MockRouter", addresses.router);
  const priceFeed = await ethers.getContractAt("MockPriceFeed", addresses.priceFeed);
  
  // Get current WETH price
  const currentPrice = await priceFeed.getPrice();
  const priceUSD = parseFloat(ethers.formatUnits(currentPrice, 18));
  
  console.log(`Current WETH price: $${priceUSD}`);
  
  // Calculate correct rate: 1 USDC should get 1/priceUSD WETH
  // Rate is stored with 18 decimals, so multiply by 1e18
  // Use BigInt math to avoid precision issues
  const rateValue = BigInt(1e18) / BigInt(Math.floor(priceUSD));
  const correctRate = rateValue;
  
  console.log(`Setting rate to: ${ethers.formatUnits(correctRate, 18)} WETH per USDC`);
  
  await router.setRate(correctRate);
  console.log("✅ Router rate updated");
  
  // Test calculation
  const testAmount = ethers.parseUnits("100", 6);
  const numerator = testAmount * correctRate;
  const intermediate = numerator / BigInt("1000000000000000000");
  const amountOut = intermediate / BigInt("1000000");
  
  console.log(`Test: 100 USDC → ${ethers.formatUnits(amountOut, 18)} WETH`);
  console.log(`Expected value: ~$${100/priceUSD * priceUSD} = $100`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });