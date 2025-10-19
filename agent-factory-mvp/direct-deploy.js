import { ethers } from 'ethers';
import fs from 'fs';

// Load wallet configuration
const walletInfo = JSON.parse(fs.readFileSync('.wallet-arbitrum-sepolia.json', 'utf8'));

// Connect to Arbitrum Sepolia
const provider = new ethers.JsonRpcProvider(walletInfo.rpcUrl);
const wallet = new ethers.Wallet(walletInfo.privateKey, provider);

console.log('🚀 Starting Direct Arbitrum Sepolia Deployment...');
console.log('===============================================');
console.log('📍 Deploying from:', wallet.address);

// Check balance
const balance = await provider.getBalance(wallet.address);
console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');

if (parseFloat(ethers.formatEther(balance)) < 0.01) {
  console.log('❌ Insufficient balance for deployment');
  process.exit(1);
}

console.log('✅ Connected to Arbitrum Sepolia');
console.log('📦 Chain ID:', (await provider.getNetwork()).chainId);
console.log('📦 Latest block:', await provider.getBlockNumber());

// Load pre-compiled contract artifacts
const loadArtifact = (name) => {
  try {
    const artifact = JSON.parse(fs.readFileSync(`artifacts/contracts/${name}.sol/${name}.json`, 'utf8'));
    return artifact;
  } catch (error) {
    console.log(`   ❌ Could not load ${name} artifact`);
    return null;
  }
};

// Deploy contract function
async function deployContract(name, constructorArgs = []) {
  console.log(`\n🔨 Deploying ${name}...`);
  
  const artifact = loadArtifact(name);
  if (!artifact) {
    console.log(`   ❌ Skipping ${name} - artifact not found`);
    return null;
  }
  
  try {
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
    
    // Estimate gas
    const gasEstimate = await factory.getDeployTransaction(...constructorArgs).then(tx => 
      provider.estimateGas(tx)
    );
    
    console.log(`   ⛽ Estimated gas: ${gasEstimate.toString()}`);
    
    // Deploy with gas settings
    const contract = await factory.deploy(...constructorArgs, {
      gasLimit: gasEstimate * 120n / 100n, // 20% buffer
      gasPrice: ethers.parseUnits('1', 'gwei')
    });
    
    console.log(`   📤 Transaction hash: ${contract.deploymentTransaction().hash}`);
    console.log(`   ⏳ Waiting for confirmation...`);
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    
    console.log(`   ✅ ${name} deployed at: ${address}`);
    
    return {
      name,
      address,
      contract,
      txHash: contract.deploymentTransaction().hash
    };
    
  } catch (error) {
    console.log(`   ❌ Failed to deploy ${name}:`, error.message);
    return null;
  }
}

// Deploy all contracts
async function deployAll() {
  const deployments = [];
  
  try {
    // Deploy AgentFactory first (no dependencies)
    const agentFactory = await deployContract('AgentFactory');
    if (agentFactory) deployments.push(agentFactory);
    
    // Deploy RiskManager (independent)
    const riskManager = await deployContract('RiskManager');
    if (riskManager) deployments.push(riskManager);
    
    // Deploy DeFiIntegration (independent)
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
    
    fs.writeFileSync('deployment-results.json', JSON.stringify(deploymentInfo, null, 2));
    
    console.log('\n🎉 Deployment Complete!');
    console.log('================================');
    deployments.forEach(contract => {
      console.log(`${contract.name}: ${contract.address}`);
    });
    console.log('\n📄 Results saved to deployment-results.json');
    
    // Test basic functionality if AgentFactory deployed
    if (agentFactory && agentFactory.contract) {
      console.log('\n🧪 Testing AgentFactory...');
      try {
        const totalSupply = await agentFactory.contract.totalSupply();
        console.log(`   📊 Initial total supply: ${totalSupply}`);
        
        console.log('   🔍 Testing createAgent()...');
        const createTx = await agentFactory.contract.createAgent({
          gasLimit: 2000000,
          gasPrice: ethers.parseUnits('1', 'gwei')
        });
        
        console.log(`   📤 Create agent transaction: ${createTx.hash}`);
        await createTx.wait();
        
        const newTotalSupply = await agentFactory.contract.totalSupply();
        console.log(`   📊 New total supply: ${newTotalSupply}`);
        console.log('   ✅ AgentFactory test passed!');
        
      } catch (error) {
        console.log('   ❌ AgentFactory test failed:', error.message);
      }
    }
    
    console.log('\n🚀 Ready for agent creation and trading!');
    return deployments;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// Run deployment
deployAll().catch(console.error);