const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting Arbitrum Sepolia Deployment...");
  console.log("==========================================");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying from:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (parseFloat(hre.ethers.formatEther(balance)) < 0.01) {
    console.log("❌ Insufficient balance for deployment");
    return;
  }
  
  const deployments = [];
  
  // Deploy AgentFactory
  console.log("\n🔨 Deploying AgentFactory...");
  const AgentFactory = await hre.ethers.getContractFactory("AgentFactory");
  const agentFactory = await AgentFactory.deploy();
  await agentFactory.waitForDeployment();
  
  const factoryAddress = await agentFactory.getAddress();
  console.log("   ✅ AgentFactory deployed at:", factoryAddress);
  deployments.push({
    name: "AgentFactory",
    address: factoryAddress,
    txHash: agentFactory.deploymentTransaction().hash
  });
  
  // Deploy AgentRegistry
  console.log("\n🔨 Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(factoryAddress);
  await agentRegistry.waitForDeployment();
  
  const registryAddress = await agentRegistry.getAddress();
  console.log("   ✅ AgentRegistry deployed at:", registryAddress);
  deployments.push({
    name: "AgentRegistry", 
    address: registryAddress,
    txHash: agentRegistry.deploymentTransaction().hash
  });
  
  // Deploy RiskManager
  console.log("\n🔨 Deploying RiskManager...");
  const RiskManager = await hre.ethers.getContractFactory("RiskManager");
  const riskManager = await RiskManager.deploy();
  await riskManager.waitForDeployment();
  
  const riskAddress = await riskManager.getAddress();
  console.log("   ✅ RiskManager deployed at:", riskAddress);
  deployments.push({
    name: "RiskManager",
    address: riskAddress,
    txHash: riskManager.deploymentTransaction().hash
  });
  
  // Deploy DeFiIntegration
  console.log("\n🔨 Deploying DeFiIntegration...");
  const DeFiIntegration = await hre.ethers.getContractFactory("DeFiIntegration");
  const defiIntegration = await DeFiIntegration.deploy();
  await defiIntegration.waitForDeployment();
  
  const defiAddress = await defiIntegration.getAddress();
  console.log("   ✅ DeFiIntegration deployed at:", defiAddress);
  deployments.push({
    name: "DeFiIntegration",
    address: defiAddress,
    txHash: defiIntegration.deploymentTransaction().hash
  });
  
  // Save deployment results
  const deploymentInfo = {
    network: "arbitrum-sepolia",
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployments
  };
  
  fs.writeFileSync("deployment-results.json", JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n🎉 Deployment Complete!");
  console.log("================================");
  deployments.forEach(contract => {
    console.log(`${contract.name}: ${contract.address}`);
  });
  console.log("\n📄 Results saved to deployment-results.json");
  
  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  
  try {
    // Test AgentFactory
    console.log("   🔍 Testing AgentFactory.createAgent()...");
    const tx = await agentFactory.createAgent();
    const receipt = await tx.wait();
    console.log("   ✅ Agent created successfully!");
    
    const totalSupply = await agentFactory.totalSupply();
    console.log(`   📊 Total agents: ${totalSupply}`);
    
    // Test AgentRegistry
    console.log("   🔍 Testing AgentRegistry strategies...");
    const activeAgentsCount = await agentRegistry.getActiveAgentsCount();
    console.log(`   📊 Active agents in registry: ${activeAgentsCount}`);
    
    console.log("\n✅ All tests passed!");
    
  } catch (error) {
    console.log("   ❌ Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });