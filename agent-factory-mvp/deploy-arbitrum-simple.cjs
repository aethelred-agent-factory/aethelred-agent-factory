const { ethers } = require('ethers');
const fs = require('fs');

async function main() {
  console.log('🚀 Starting Arbitrum Sepolia Deployment...');
  console.log('==========================================');

  // Load environment
  require('dotenv').config();
  
  // Setup provider and wallet
  const rpcUrl = "https://arb-sepolia.g.alchemy.com/v2/G-0JsbpcHJNVzXSWr67Jv1ZoGMq7VELg";
  const privateKey = process.env.ARBITRUM_PRIVATE_KEY || "0xf74e7e0befcf6dbda6961a306b11753c9a7d080b3f53e8c126cb95c879587cb4";
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log('📍 Deploying from:', wallet.address);
  
  // Check balance
  const balance = await wallet.provider.getBalance(wallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
  
  if (parseFloat(ethers.formatEther(balance)) < 0.001) {
    console.log('❌ Insufficient balance for deployment (need at least 0.001 ETH)');
    return;
  }
  
  const deployments = [];
  
  // Load contract artifacts
  function loadArtifact(name) {
    try {
      const artifact = JSON.parse(fs.readFileSync(`artifacts/contracts/${name}.sol/${name}.json`, 'utf8'));
      return artifact;
    } catch (error) {
      console.log(`❌ Could not load ${name} artifact:`, error.message);
      return null;
    }
  }
  
  // Deploy contract function
  async function deployContract(name, constructorArgs = []) {
    console.log(`\n🔨 Deploying ${name}...`);
    
    const artifact = loadArtifact(name);
    if (!artifact) {
      console.log(`❌ Skipping ${name} - artifact not found`);
      return null;
    }
    
    try {
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
      
      // Deploy with gas settings for Arbitrum
      const contract = await factory.deploy(...constructorArgs, {
        gasLimit: 8000000,
        gasPrice: ethers.parseUnits('0.1', 'gwei')
      });
      
      console.log(`📤 Transaction hash: ${contract.deploymentTransaction().hash}`);
      console.log(`⏳ Waiting for confirmation...`);
      
      await contract.waitForDeployment();
      const address = await contract.getAddress();
      
      console.log(`✅ ${name} deployed at: ${address}`);
      
      return {
        name,
        address,
        contract,
        txHash: contract.deploymentTransaction().hash
      };
      
    } catch (error) {
      console.log(`❌ Failed to deploy ${name}:`, error.message);
      return null;
    }
  }
  
  try {
    // Deploy AgentFactory first
    const agentFactory = await deployContract('AgentFactory');
    if (agentFactory) deployments.push(agentFactory);
    
    // Deploy RiskManager
    const riskManager = await deployContract('RiskManager');
    if (riskManager) deployments.push(riskManager);
    
    // Deploy DeFiIntegration
    const defiIntegration = await deployContract('DeFiIntegration');
    if (defiIntegration) deployments.push(defiIntegration);
    
    // Deploy AgentRegistry (depends on AgentFactory)
    if (agentFactory) {
      const agentRegistry = await deployContract('AgentRegistry', [agentFactory.address]);
      if (agentRegistry) deployments.push(agentRegistry);
    }
    
    // Save deployment results
    const deploymentInfo = {
      network: 'arbitrum-sepolia',
      deployer: wallet.address,
      timestamp: new Date().toISOString(),
      contracts: deployments.map(d => ({
        name: d.name,
        address: d.address,
        txHash: d.txHash
      }))
    };
    
    fs.writeFileSync('deployment-results-arbitrum.json', JSON.stringify(deploymentInfo, null, 2));
    
    console.log('\n🎉 Deployment Complete!');
    console.log('================================');
    deployments.forEach(contract => {
      console.log(`${contract.name}: ${contract.address}`);
    });
    console.log('\n📄 Results saved to deployment-results-arbitrum.json');
    
    // Test basic functionality
    if (agentFactory && agentFactory.contract) {
      console.log('\n🧪 Testing AgentFactory...');
      try {
        const totalSupply = await agentFactory.contract.totalSupply();
        console.log(`📊 Initial total supply: ${totalSupply}`);
        
        console.log('🔍 Testing createAgent()...');
        const createTx = await agentFactory.contract.createAgent({
          gasLimit: 2000000,
          gasPrice: ethers.parseUnits('0.1', 'gwei')
        });
        
        console.log(`📤 Create agent transaction: ${createTx.hash}`);
        await createTx.wait();
        
        const newTotalSupply = await agentFactory.contract.totalSupply();
        console.log(`📊 New total supply: ${newTotalSupply}`);
        console.log('✅ AgentFactory test passed!');
        
      } catch (error) {
        console.log('❌ AgentFactory test failed:', error.message);
      }
    }
    
    console.log('\n🚀 Ready for agent creation and trading on Arbitrum Sepolia!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });