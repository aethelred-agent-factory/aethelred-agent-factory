import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  const router = await ethers.getContractAt("MockRouter", addresses.router);
  
  // Test with much larger rate to avoid precision loss
  // Instead of 0.0004, let's use 0.04 (100x larger)
  const testRate = ethers.parseUnits("0.04", 18);
  
  console.log(`Testing with rate: ${ethers.formatUnits(testRate, 18)} WETH per USDC`);
  
  await router.setRate(testRate);
  
  // Test calculation
  const testAmount = ethers.parseUnits("100", 6);
  const numerator = testAmount * testRate;
  const intermediate = numerator / BigInt("1000000000000000000");
  const amountOut = intermediate / BigInt("1000000");
  
  console.log(`Test: 100 USDC → ${ethers.formatUnits(amountOut, 18)} WETH`);
  
  // Now test actual swap
  const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
  const weth = await ethers.getContractAt("MockERC20", addresses.weth);
  const [signer] = await ethers.getSigners();
  
  try {
    const balBefore = await weth.balanceOf(signer.address);
    await usdc.approve(addresses.router, testAmount);
    await router.swapAForB(signer.address, signer.address, testAmount);
    const balAfter = await weth.balanceOf(signer.address);
    
    console.log(`✅ Swap succeeded! Received: ${ethers.formatUnits(balAfter - balBefore, 18)} WETH`);
  } catch (error) {
    console.error("❌ Swap failed:", error.message);
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });