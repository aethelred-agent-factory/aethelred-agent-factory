import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

// Helper to log and return deployed contract instance
async function deployContract(factoryName, args = []) {
  const factory = await ethers.getContractFactory(factoryName);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment(); // Use waitForDeployment for modern hardhat-ethers
  console.log(`${factoryName} deployed to: ${contract.target}`);
  return contract;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with", deployer.address);

  // Deploy Contracts
  const usdc = await deployContract("MockERC20", ["MockUSDC", "mUSDC"]);
  const weth = await deployContract("MockERC20", ["MockWETH", "mWETH"]);

  const initialRate = ethers.parseUnits("0.0005", 18); // 1 USDC -> 0.0005 WETH (Rate scaled by 1e18)
  const mockRouter = await deployContract("MockRouter", [usdc.target, weth.target, initialRate]);

  // FIX: PriceFeed initialized to 2000 USD/WETH, scaled by 1e18.
  const priceFeed = await deployContract("MockPriceFeed", [ethers.parseUnits("2000", 18)]);

  const walletImpl = await deployContract("AgentWallet");

  const mintFee = ethers.parseEther("0.01");
  const factory = await deployContract("AgentFactory", [walletImpl.target, mintFee]);

  // Seed Router Liquidity and Controller
  const mintAmountUSDC = ethers.parseUnits("1000000", 6); // 1M mUSDC (6 decimals)
  const mintAmountWETH = ethers.parseUnits("100", 18); // 100 mWETH (18 decimals)
  const controllerAmountUSDC = ethers.parseUnits("100000", 6); // 100K for controller

  await usdc.mint(deployer.address, mintAmountUSDC + controllerAmountUSDC);
  await weth.mint(deployer.address, mintAmountWETH);

  await usdc.approve(mockRouter.target, mintAmountUSDC);
  await weth.approve(mockRouter.target, mintAmountWETH);

  await mockRouter.deposit(usdc.target, mintAmountUSDC);
  await mockRouter.deposit(weth.target, mintAmountWETH);
  console.log("Router funded with tokens.");

  // Write Addresses
  const out = {
    usdc: usdc.target,
    weth: weth.target,
    router: mockRouter.target,
    priceFeed: priceFeed.target,
    walletImpl: walletImpl.target,
    factory: factory.target
  };

  const filePath = "deployed_addresses.json";
  fs.writeFileSync(filePath, JSON.stringify(out, null, 2));
  console.log(`Wrote deployed addresses to ${filePath}`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
