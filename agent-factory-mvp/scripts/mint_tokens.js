import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  const addresses = JSON.parse(fs.readFileSync("deployed_addresses.json", "utf8"));
  
  // Get USDC contract
  const usdcAbi = JSON.parse(fs.readFileSync("artifacts/contracts/MockERC20.sol/MockERC20.json", "utf8")).abi;
  const usdc = new ethers.Contract(addresses.usdc, usdcAbi, deployer);
  
  // Mint 1M USDC to deployer
  const mintAmount = ethers.parseUnits("1000000", 6);
  console.log(`Minting ${ethers.formatUnits(mintAmount, 6)} USDC to deployer...`);
  
  const tx = await usdc.mint(deployer.address, mintAmount);
  await tx.wait();
  
  const balance = await usdc.balanceOf(deployer.address);
  console.log(`Deployer USDC balance: ${ethers.formatUnits(balance, 6)}`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });