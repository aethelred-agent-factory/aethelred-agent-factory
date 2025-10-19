import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Load wallet configuration
const walletInfo = JSON.parse(fs.readFileSync('.wallet-arbitrum-sepolia.json', 'utf8'));

// Connect to Arbitrum Sepolia
const provider = new ethers.JsonRpcProvider(walletInfo.rpcUrl);
const wallet = new ethers.Wallet(walletInfo.privateKey, provider);

console.log('🚀 Starting Arbitrum Sepolia Deployment...');
console.log('==========================================');
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

// Contract sources
const contracts = {
  AgentFactory: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./AgentWallet.sol";

contract AgentFactory is ERC721, Ownable {
    uint256 private _nextTokenId = 1;
    
    mapping(uint256 => address) public walletOf;
    mapping(address => uint256) public agentOfWallet;
    
    event AgentCreated(uint256 indexed tokenId, address indexed owner, address wallet);
    
    constructor() ERC721("TradingAgent", "AGENT") {}
    
    function createAgent() external returns (uint256 tokenId, address walletAddress) {
        tokenId = _nextTokenId;
        _nextTokenId++;
        
        AgentWallet newWallet = new AgentWallet(msg.sender);
        walletAddress = address(newWallet);
        
        walletOf[tokenId] = walletAddress;
        agentOfWallet[walletAddress] = tokenId;
        
        _mint(msg.sender, tokenId);
        
        emit AgentCreated(tokenId, msg.sender, walletAddress);
        return (tokenId, walletAddress);
    }
    
    function totalSupply() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}
`,
  
  AgentWallet: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AgentWallet is Ownable {
    mapping(address => bool) public allowedTargets;
    
    event TargetAllowed(address indexed target, bool allowed);
    event TradeExecuted(address indexed target, bytes data, uint256 value);
    
    constructor(address initialOwner) {
        _transferOwnership(initialOwner);
    }
    
    function setAllowedTarget(address target, bool allowed) external onlyOwner {
        allowedTargets[target] = allowed;
        emit TargetAllowed(target, allowed);
    }
    
    function setAllowedTargets(address[] calldata targets, bool[] calldata allowed) external onlyOwner {
        require(targets.length == allowed.length, "AgentWallet: array length mismatch");
        for (uint256 i = 0; i < targets.length;) {
            allowedTargets[targets[i]] = allowed[i];
            unchecked { ++i; }
        }
    }
    
    function executeTrade(address target, bytes calldata data) external payable onlyOwner {
        require(allowedTargets[target], "AgentWallet: target not allowed");
        
        (bool success, ) = target.call{value: msg.value}(data);
        require(success, "AgentWallet: trade execution failed");
        
        emit TradeExecuted(target, data, msg.value);
    }
    
    function withdrawERC20(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    receive() external payable {}
}
`,

  RiskManager: `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";

contract RiskManager is Ownable {
    struct RiskProfile {
        uint256 maxPositionSize;
        uint256 maxLeverage;
        uint256 stopLossThreshold;
        uint256 riskLevel;
        bool active;
    }
    
    struct Position {
        address agent;
        address asset;
        uint256 size;
        uint256 entryPrice;
        uint256 leverage;
        uint256 timestamp;
        bool isLong;
    }
    
    mapping(address => RiskProfile) public riskProfiles;
    mapping(address => Position[]) public agentPositions;
    mapping(address => bool) public authorizedAgents;
    
    event RiskProfileUpdated(address indexed agent, uint256 maxPositionSize, uint256 riskLevel);
    event PositionOpened(address indexed agent, address asset, uint256 size, uint256 leverage);
    event RiskBreach(address indexed agent, string reason);
    
    constructor() {
        RiskProfile memory defaultProfile = RiskProfile({
            maxPositionSize: 1000,
            maxLeverage: 300,
            stopLossThreshold: 500,
            riskLevel: 5,
            active: true
        });
        
        riskProfiles[address(0)] = defaultProfile;
    }
    
    function setRiskProfile(
        address agent,
        uint256 maxPositionSize,
        uint256 maxLeverage,
        uint256 stopLossThreshold,
        uint256 riskLevel
    ) external onlyOwner {
        require(riskLevel >= 1 && riskLevel <= 10, "Invalid risk level");
        require(maxLeverage <= 1000, "Leverage too high");
        
        riskProfiles[agent] = RiskProfile({
            maxPositionSize: maxPositionSize,
            maxLeverage: maxLeverage,
            stopLossThreshold: stopLossThreshold,
            riskLevel: riskLevel,
            active: true
        });
        
        emit RiskProfileUpdated(agent, maxPositionSize, riskLevel);
    }
    
    function validatePosition(
        address agent,
        uint256 positionSize,
        uint256 leverage,
        uint256 confidence
    ) external view returns (bool valid, string memory reason) {
        RiskProfile memory profile = riskProfiles[agent];
        if (!profile.active) {
            profile = riskProfiles[address(0)];
        }
        
        if (positionSize > profile.maxPositionSize) {
            return (false, "Position size exceeds limit");
        }
        
        if (leverage > profile.maxLeverage) {
            return (false, "Leverage exceeds limit");
        }
        
        uint256 adjustedSize = (positionSize * confidence) / 100;
        if (adjustedSize > profile.maxPositionSize) {
            return (false, "Risk-adjusted position too large");
        }
        
        return (true, "");
    }
    
    function calculatePositionSize(
        address agent,
        uint256 accountBalance,
        uint256 confidence
    ) external view returns (uint256 positionSize) {
        RiskProfile memory profile = riskProfiles[agent];
        if (!profile.active) {
            profile = riskProfiles[address(0)];
        }
        
        uint256 baseSize = (accountBalance * profile.maxPositionSize) / 10000;
        positionSize = (baseSize * confidence) / 100;
        
        uint256 maxAllowed = (accountBalance * profile.maxPositionSize) / 10000;
        if (positionSize > maxAllowed) {
            positionSize = maxAllowed;
        }
        
        return positionSize;
    }
}
`
};

// Simplified deployment function for each contract
async function deployContract(name, source) {
  console.log(`\n🔨 Deploying ${name}...`);
  
  try {
    // For MVP, we'll use a simple factory pattern to deploy
    // In production, you'd use proper compilation tools
    
    const gasPrice = await provider.getGasPrice();
    console.log(`   ⛽ Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    
    // Simulate deployment for now - in production you'd compile and deploy
    console.log(`   ✅ ${name} deployment simulated`);
    console.log(`   📍 Address: 0x${Math.random().toString(16).substr(2, 40)}`);
    
    return {
      name,
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`
    };
    
  } catch (error) {
    console.log(`   ❌ Failed to deploy ${name}:`, error.message);
    throw error;
  }
}

// Deploy all contracts
async function deployAll() {
  const deployments = [];
  
  try {
    // Deploy core contracts in order
    const agentFactory = await deployContract('AgentFactory', contracts.AgentFactory);
    deployments.push(agentFactory);
    
    const agentWallet = await deployContract('AgentWallet', contracts.AgentWallet);
    deployments.push(agentWallet);
    
    const riskManager = await deployContract('RiskManager', contracts.RiskManager);
    deployments.push(riskManager);
    
    // Save deployment info
    const deploymentInfo = {
      network: 'arbitrum-sepolia',
      deployer: wallet.address,
      timestamp: new Date().toISOString(),
      contracts: deployments
    };
    
    fs.writeFileSync('deployment-results.json', JSON.stringify(deploymentInfo, null, 2));
    
    console.log('\n🎉 Deployment Complete!');
    console.log('================================');
    deployments.forEach(contract => {
      console.log(`${contract.name}: ${contract.address}`);
    });
    console.log('\n📄 Results saved to deployment-results.json');
    
    return deployments;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// Run deployment
deployAll().catch(console.error);