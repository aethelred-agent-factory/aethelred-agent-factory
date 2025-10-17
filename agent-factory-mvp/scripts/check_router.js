import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  
  const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
  const weth = await ethers.getContractAt("MockERC20", addresses.weth);
  const router = await ethers.getContractAt("MockRouter", addresses.router);
  
  console.log("🔍 Router Liquidity Check");
  console.log("========================");
  
  const usdcLiquidity = await usdc.balanceOf(addresses.router);
  const wethLiquidity = await weth.balanceOf(addresses.router);
  
  console.log(`USDC Liquidity: ${ethers.formatUnits(usdcLiquidity, 6)}`);
  console.log(`WETH Liquidity: ${ethers.formatUnits(wethLiquidity, 18)}`);
  
  // Test a small swap calculation
  try {
    const swapAmount = ethers.parseUnits("100", 6);
    const expectedWeth = await router.getAmountOut(addresses.usdc, addresses.weth, swapAmount);
    console.log(`Expected WETH for 100 USDC: ${ethers.formatUnits(expectedWeth, 18)}`);
  } catch (error) {
    console.error("Swap calculation error:", error.message);
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });