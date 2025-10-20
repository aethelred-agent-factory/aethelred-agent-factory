const { ethers } = require('ethers');
const fs = require('fs');

// Load deployment info
const deploymentInfo = JSON.parse(fs.readFileSync('deployment-results-arbitrum-sepolia.json', 'utf8'));
const addresses = deploymentInfo.contracts.reduce((acc, contract) => {
  acc[contract.name] = contract.address;
  return acc;
}, {});

console.log('🔗 Arbitrum Sepolia Contract Interaction Demo');
console.log('===========================================');

async function main() {
  // Setup provider and wallet
  const rpcUrl = deploymentInfo.rpcUrl;
  const privateKey = "0xf74e7e0befcf6dbda6961a306b11753c9a7d080b3f53e8c126cb95c879587cb4";
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`📍 Connected to ${deploymentInfo.network}`);
  console.log(`📱 Using wallet: ${wallet.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await wallet.provider.getBalance(wallet.address))} ETH\n`);

  // Contract ABIs (simplified for interaction)
  const agentFactoryABI = [
    "function createAgent() external payable returns (uint256)",
    "function balanceOf(address owner) external view returns (uint256)",
    "function walletOf(uint256 tokenId) external view returns (address)",
    "function owner() external view returns (address)"
  ];

  const agentRegistryABI = [
    "function addStrategy(string memory name, string memory description, uint256 riskLevel, uint256 maxPositionSize) external returns (uint256)",
    "function registerAgent(uint256 agentId, address agentOwner, address wallet, uint256 strategyId) external",
    "function getActiveAgentsCount() external view returns (uint256)",
    "function agentFactory() external view returns (address)"
  ];

  const riskManagerABI = [
    "function setRiskParameters(address agent, tuple(uint256,uint256,uint256,bool,uint256) params) external",
    "function checkRisk(address agent, uint256 currentValue) external view returns (bool)",
    "function owner() external view returns (address)"
  ];

  const defiIntegrationABI = [
    "function addPool(address poolAddress, address tokenA, address tokenB, uint256 fee) external returns (uint256)",
    "function openPosition(address agent, address protocol, address token, uint256 amount) external returns (uint256)",
    "function poolCount() external view returns (uint256)",
    "function positionCount() external view returns (uint256)"
  ];

  // Initialize contracts
  const agentFactory = new ethers.Contract(addresses.AgentFactory, agentFactoryABI, wallet);
  const agentRegistry = new ethers.Contract(addresses.SimpleAgentRegistry, agentRegistryABI, wallet);
  const riskManager = new ethers.Contract(addresses.SimpleRiskManager, riskManagerABI, wallet);
  const defiIntegration = new ethers.Contract(addresses.SimpleDeFiIntegration, defiIntegrationABI, wallet);

  console.log('📋 Contract Interaction Tests:');
  console.log('==============================\n');

  try {
    // Test 1: Check current state
    console.log('🔍 Test 1: Current State Check');
    const currentAgentBalance = await agentFactory.balanceOf(wallet.address);
    const activeAgentsCount = await agentRegistry.getActiveAgentsCount();
    const poolCount = await defiIntegration.poolCount();
    
    console.log(`   📊 Current agent balance: ${currentAgentBalance}`);
    console.log(`   📊 Active agents in registry: ${activeAgentsCount}`);
    console.log(`   📊 Total pools: ${poolCount}\n`);

    // Test 2: Create a new agent
    console.log('🔍 Test 2: Create New Agent');
    const createAgentTx = await agentFactory.createAgent({
      gasLimit: 2000000,
      gasPrice: ethers.parseUnits('0.1', 'gwei')
    });
    
    console.log(`   📤 Transaction hash: ${createAgentTx.hash}`);
    console.log(`   ⏳ Waiting for confirmation...`);
    
    const receipt = await createAgentTx.wait();
    console.log(`   ✅ Agent created successfully!`);
    console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}\n`);

    // Get the new agent balance and wallet address
    const newAgentBalance = await agentFactory.balanceOf(wallet.address);
    const agentId = Number(newAgentBalance); // Latest agent ID
    const agentWallet = await agentFactory.walletOf(agentId);
    
    console.log(`   🎉 New agent ID: ${agentId}`);
    console.log(`   🎉 Agent wallet: ${agentWallet}\n`);

    // Test 3: Add a new strategy
    console.log('🔍 Test 3: Add New Strategy');
    const addStrategyTx = await agentRegistry.addStrategy(
      "Momentum Trading",
      "Advanced momentum-based trading strategy using technical indicators",
      7, // Risk level 7/10
      3000, // Max position size 30%
      {
        gasLimit: 500000,
        gasPrice: ethers.parseUnits('0.1', 'gwei')
      }
    );
    
    console.log(`   📤 Transaction hash: ${addStrategyTx.hash}`);
    await addStrategyTx.wait();
    console.log(`   ✅ Strategy added successfully!\n`);

    // Test 4: Register the agent with strategy
    console.log('🔍 Test 4: Register Agent with Strategy');
    const registerTx = await agentRegistry.registerAgent(
      agentId,
      wallet.address,
      agentWallet,
      1, // Strategy ID 1 (Momentum Trading)
      {
        gasLimit: 500000,
        gasPrice: ethers.parseUnits('0.1', 'gwei')
      }
    );
    
    console.log(`   📤 Transaction hash: ${registerTx.hash}`);
    await registerTx.wait();
    console.log(`   ✅ Agent registered successfully!\n`);

    // Test 5: Set risk parameters
    console.log('🔍 Test 5: Set Risk Parameters');
    const riskParams = [
      5000, // maxPositionSize: 50%
      1000, // maxDailyLoss: 10%
      2000, // maxDrawdown: 20%
      true, // stopLossEnabled
      500   // stopLossThreshold: 5%
    ];
    
    const setRiskTx = await riskManager.setRiskParameters(
      agentWallet,
      riskParams,
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('0.1', 'gwei')
      }
    );
    
    console.log(`   📤 Transaction hash: ${setRiskTx.hash}`);
    await setRiskTx.wait();
    console.log(`   ✅ Risk parameters set successfully!\n`);

    // Test 6: Add a DeFi pool
    console.log('🔍 Test 6: Add DeFi Pool');
    const mockPoolAddress = "0x1234567890123456789012345678901234567890";
    const mockTokenA = "0xA0b86a33E6433c9FC6d5D39D8fd2C0F0B3eAe58C"; // USDC-like
    const mockTokenB = "0xB1c86A33E6433c9FC6d5D39D8FD2c0f0b3EAE58d"; // WETH-like
    
    const addPoolTx = await defiIntegration.addPool(
      mockPoolAddress,
      mockTokenA,
      mockTokenB,
      3000, // 0.3% fee
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('0.1', 'gwei')
      }
    );
    
    console.log(`   📤 Transaction hash: ${addPoolTx.hash}`);
    await addPoolTx.wait();
    console.log(`   ✅ Pool added successfully!\n`);

    // Test 7: Open a position
    console.log('🔍 Test 7: Open DeFi Position');
    const openPositionTx = await defiIntegration.openPosition(
      agentWallet,
      mockPoolAddress,
      mockTokenA,
      ethers.parseUnits('1000', 6), // 1000 USDC equivalent
      {
        gasLimit: 300000,
        gasPrice: ethers.parseUnits('0.1', 'gwei')
      }
    );
    
    console.log(`   📤 Transaction hash: ${openPositionTx.hash}`);
    await openPositionTx.wait();
    console.log(`   ✅ Position opened successfully!\n`);

    // Test 8: Final state check
    console.log('🔍 Test 8: Final State Check');
    const finalAgentBalance = await agentFactory.balanceOf(wallet.address);
    const finalActiveAgentsCount = await agentRegistry.getActiveAgentsCount();
    const finalPoolCount = await defiIntegration.poolCount();
    const finalPositionCount = await defiIntegration.positionCount();
    
    console.log(`   📊 Final agent balance: ${finalAgentBalance}`);
    console.log(`   📊 Final active agents: ${finalActiveAgentsCount}`);
    console.log(`   📊 Final pool count: ${finalPoolCount}`);
    console.log(`   📊 Final position count: ${finalPositionCount}\n`);

    // Test 9: Risk check
    console.log('🔍 Test 9: Risk Management Check');
    const riskCheckResult = await riskManager.checkRisk(
      agentWallet,
      ethers.parseUnits('2000', 6) // 2000 USDC position value
    );
    console.log(`   📊 Risk check result: ${riskCheckResult ? '✅ ALLOWED' : '❌ BLOCKED'}\n`);

    console.log('🎉 All Contract Interactions Completed Successfully!');
    console.log('=================================================');
    console.log('✅ AgentFactory: Agent creation working');
    console.log('✅ AgentRegistry: Strategy management working');
    console.log('✅ RiskManager: Risk parameter setting working');
    console.log('✅ DeFiIntegration: Pool and position management working');
    console.log('\n🚀 Your agent factory ecosystem is fully operational on Arbitrum Sepolia!');

  } catch (error) {
    console.error('❌ Error during contract interaction:', error.message);
    if (error.reason) console.error('Reason:', error.reason);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });