import fs from "fs";
import hre from "hardhat";
const { ethers } = hre;

// Mainnet addresses  
const MAINNET_ADDRESSES = {
  USDC: "0xA0b86a33E6D76Bdf7bEce9EA5D56EC4C5Dd5d21b",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  ETH_USD_FEED: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  USDC_WETH_POOL: "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
  UNISWAP_V3_ROUTER: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  
  // Whale addresses for funding
  USDC_WHALE: "0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503",
  WETH_WHALE: "0x8EB8a3b98659Cce290402893d0123abb75E3ab28"
};

async function deployContract(factoryName, args = []) {
  const factory = await ethers.getContractFactory(factoryName);
  const contract = await factory.deploy(...args, {
    gasLimit: 5000000,
    maxFeePerGas: ethers.parseUnits("100", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei")
  });
  await contract.waitForDeployment();
  console.log(`${factoryName} deployed to: ${contract.target}`);
  return contract;
}

async function impersonateAndFund(address) {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  });
  
  // Give the impersonated account some ETH for gas
  await hre.network.provider.send("hardhat_setBalance", [
    address,
    "0x56BC75E2D631000000", // 100 ETH
  ]);
  
  return await ethers.getSigner(address);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy our custom contracts
  console.log("\n📦 Deploying custom contracts...");
  
  // Deploy real price feed that can use Chainlink or Uniswap
  const realPriceFeed = await deployContract("RealPriceFeed", [
    MAINNET_ADDRESSES.ETH_USD_FEED,
    MAINNET_ADDRESSES.USDC_WETH_POOL
  ]);

  // Deploy AgentWallet implementation
  const walletImpl = await deployContract("AgentWallet");

  // Deploy AgentFactory
  const mintFee = ethers.parseEther("0.01");
  const factory = await deployContract("AgentFactory", [walletImpl.target, mintFee]);

  console.log("\n💰 Setting up funding from whales...");
  
  // Impersonate USDC whale and transfer funds
  const usdcWhale = await impersonateAndFund(MAINNET_ADDRESSES.USDC_WHALE);
  const usdc = await ethers.getContractAt("IERC20", MAINNET_ADDRESSES.USDC, usdcWhale);
  
  const usdcAmount = ethers.parseUnits("100000", 6); // 100k USDC
  console.log(`Transferring ${ethers.formatUnits(usdcAmount, 6)} USDC to deployer...`);
  await usdc.transfer(deployer.address, usdcAmount);

  // Impersonate WETH whale and transfer funds  
  const wethWhale = await impersonateAndFund(MAINNET_ADDRESSES.WETH_WHALE);
  const weth = await ethers.getContractAt("IERC20", MAINNET_ADDRESSES.WETH, wethWhale);
  
  const wethAmount = ethers.parseUnits("50", 18); // 50 WETH
  console.log(`Transferring ${ethers.formatUnits(wethAmount, 18)} WETH to deployer...`);
  await weth.transfer(deployer.address, wethAmount);

  // Verify balances
  const deployerUSDC = await usdc.balanceOf(deployer.address);
  const deployerWETH = await weth.balanceOf(deployer.address);
  console.log(`Deployer USDC balance: ${ethers.formatUnits(deployerUSDC, 6)}`);
  console.log(`Deployer WETH balance: ${ethers.formatUnits(deployerWETH, 18)}`);

  // Get current prices
  console.log("\n📊 Checking live prices...");
  const currentPrice = await realPriceFeed.getPrice();
  console.log(`Current ETH/USD price: $${ethers.formatUnits(currentPrice, 18)}`);

  // Write addresses for mainnet fork
  const addresses = {
    // Our deployed contracts
    factory: factory.target,
    walletImpl: walletImpl.target,
    priceFeed: realPriceFeed.target,
    
    // Mainnet contracts
    usdc: MAINNET_ADDRESSES.USDC,
    weth: MAINNET_ADDRESSES.WETH,
    router: MAINNET_ADDRESSES.UNISWAP_V3_ROUTER,
    
    // Additional mainnet addresses
    chainlinkFeed: MAINNET_ADDRESSES.ETH_USD_FEED,
    uniswapPool: MAINNET_ADDRESSES.USDC_WETH_POOL,
    
    // Network info
    network: "mainnet-fork",
    blockNumber: await ethers.provider.getBlockNumber()
  };

  const filePath = "mainnet_fork_addresses.json";
  fs.writeFileSync(filePath, JSON.stringify(addresses, null, 2));
  console.log(`\n📝 Wrote mainnet fork addresses to ${filePath}`);
  
  console.log("\n🎉 Mainnet fork setup complete!");
  console.log("🤖 Ready to deploy agents that trade with real market data!");
}

main().catch((err) => { 
  console.error(err); 
  process.exitCode = 1; 
});