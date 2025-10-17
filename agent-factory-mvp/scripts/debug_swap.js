import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  const [signer] = await ethers.getSigners();
  
  console.log("🔍 Debug Swap Functionality");
  console.log("===========================");
  
  // Connect to contracts
  const usdc = await ethers.getContractAt("MockERC20", addresses.usdc);
  const weth = await ethers.getContractAt("MockERC20", addresses.weth);
  const router = await ethers.getContractAt("MockRouter", addresses.router);
  const factory = await ethers.getContractAt("AgentFactory", addresses.factory);
  
  // Get agent wallet address
  const walletAddr = await factory.walletOf(0);
  console.log(`Agent Wallet: ${walletAddr}`);
  
  // Check balances
  const usdcBal = await usdc.balanceOf(walletAddr);
  const wethBal = await weth.balanceOf(walletAddr);
  console.log(`USDC Balance: ${ethers.formatUnits(usdcBal, 6)}`);
  console.log(`WETH Balance: ${ethers.formatUnits(wethBal, 18)}`);
  
  // Check router liquidity
  const routerUSDC = await usdc.balanceOf(addresses.router);
  const routerWETH = await weth.balanceOf(addresses.router);
  console.log(`Router USDC: ${ethers.formatUnits(routerUSDC, 6)}`);
  console.log(`Router WETH: ${ethers.formatUnits(routerWETH, 18)}`);
  
  // Check allowance
  const allowance = await usdc.allowance(walletAddr, addresses.router);
  console.log(`Allowance: ${ethers.formatUnits(allowance, 6)}`);
  
  // Check router rate
  const rate = await router.rate();
  console.log(`Router Rate: ${ethers.formatUnits(rate, 18)} WETH per USDC`);
  
  // Try manual swap from signer (should work)
  console.log("\n🧪 Testing direct swap from signer...");
  const testAmount = ethers.parseUnits("10", 6);
  
  try {
    await usdc.approve(addresses.router, testAmount);
    console.log("✅ Approved");
    
    const beforeUSDC = await usdc.balanceOf(signer.address);
    const beforeWETH = await weth.balanceOf(signer.address);
    
    await router.swapAForB(signer.address, signer.address, testAmount);
    console.log("✅ Direct swap succeeded");
    
    const afterUSDC = await usdc.balanceOf(signer.address);
    const afterWETH = await weth.balanceOf(signer.address);
    
    console.log(`USDC change: ${ethers.formatUnits(afterUSDC - beforeUSDC, 6)}`);
    console.log(`WETH change: ${ethers.formatUnits(afterWETH - beforeWETH, 18)}`);
    
  } catch (error) {
    console.error("❌ Direct swap failed:", error.message);
  }
}

main().catch((err) => { console.error(err); process.exitCode = 1; });