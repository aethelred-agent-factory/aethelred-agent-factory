import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  
  // Get PriceFeed contract
  const priceFeedAbi = JSON.parse(fs.readFileSync("artifacts/contracts/MockPriceFeed.sol/MockPriceFeed.json", "utf8")).abi;
  const priceFeed = new ethers.Contract(addresses.priceFeed, priceFeedAbi, deployer);
  
  // Get current price
  const currentPrice = await priceFeed.getPrice();
  console.log(`Current WETH price: $${ethers.formatUnits(currentPrice, 18)}`);
  
  // Set new price (argument from command line or default to 2150)
  const newPriceUSD = process.argv[2] || "2150";
  const newPrice = ethers.parseUnits(newPriceUSD, 18);
  
  console.log(`Setting new WETH price to: $${newPriceUSD}`);
  
  const tx = await priceFeed.setPrice(newPrice);
  await tx.wait();
  
  const updatedPrice = await priceFeed.getPrice();
  console.log(`Updated WETH price: $${ethers.formatUnits(updatedPrice, 18)}`);
  
  if (parseFloat(newPriceUSD) > 2100) {
    console.log("🚀 Price is above $2100 - AI agent should trigger a swap!");
  } else {
    console.log("📉 Price is below $2100 - AI agent should hold.");
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });