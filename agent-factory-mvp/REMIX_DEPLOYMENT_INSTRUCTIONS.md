# Arbitrum Sepolia Deployment Instructions - Remix IDE

## 🎯 Quick Deployment Guide

### Step 1: Open Remix IDE
- Go to https://remix.ethereum.org/
- Create a new workspace or use default

### Step 2: Upload Contract Files
Copy and paste these 4 optimized contracts into Remix:

#### 1. AgentFactory.sol
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AgentWallet {
    address public owner;
    mapping(address => bool) public allowedTargets;
    
    event TargetAllowed(address indexed target, bool allowed);
    event TradeExecuted(address indexed target, bytes data, uint256 value);
    
    constructor(address initialOwner) {
        owner = initialOwner;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    function setAllowedTarget(address target, bool allowed) external onlyOwner {
        allowedTargets[target] = allowed;
        emit TargetAllowed(target, allowed);
    }
    
    function executeTrade(address target, bytes calldata data) external payable onlyOwner {
        require(allowedTargets[target], "Target not allowed");
        (bool success, ) = target.call{value: msg.value}(data);
        require(success, "Trade execution failed");
        emit TradeExecuted(target, data, msg.value);
    }
    
    receive() external payable {}
}

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
```

#### 2. RiskManager.sol
```solidity
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
    
    mapping(address => RiskProfile) public riskProfiles;
    mapping(address => bool) public authorizedAgents;
    
    event RiskProfileUpdated(address indexed agent, uint256 maxPositionSize, uint256 riskLevel);
    event RiskBreach(address indexed agent, string reason);
    
    constructor() {
        riskProfiles[address(0)] = RiskProfile({
            maxPositionSize: 1000,
            maxLeverage: 300,
            stopLossThreshold: 500,
            riskLevel: 5,
            active: true
        });
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
        
        return positionSize;
    }
}
```

### Step 3: Configure Arbitrum Sepolia Network

In Remix:
1. Go to "Deploy & Run Transactions" tab
2. Select "Injected Provider - MetaMask" as Environment
3. In MetaMask, add Arbitrum Sepolia network:
   - Network Name: Arbitrum Sepolia
   - RPC URL: https://arb-sepolia.g.alchemy.com/v2/G-0JsbpcHJNVzXSWr67Jv1ZoGMq7VELg
   - Chain ID: 421614
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.arbiscan.io

### Step 4: Import Wallet to MetaMask
- Private Key: `0xf74e7e0befcf6dbda6961a306b11753c9a7d080b3f53e8c126cb95c879587cb4`
- Address: `0xb0eb4bfd410e6e9460ee7b3e4a960fd9eeda148b`
- Balance: 0.1 ETH

### Step 5: Deploy Contracts

1. **Deploy AgentFactory:**
   - Select AgentFactory contract
   - Click Deploy (no constructor parameters)
   - Save the deployed address

2. **Deploy RiskManager:**
   - Select RiskManager contract
   - Click Deploy (no constructor parameters)
   - Save the deployed address

### Step 6: Test Deployment

After deployment, test basic functionality:

1. **Test AgentFactory.createAgent():**
   - Expand deployed AgentFactory contract
   - Click "createAgent" button
   - Confirm transaction
   - Check for AgentCreated event

2. **Test RiskManager.validatePosition():**
   - Use address(0), 500, 200, 80 as test parameters
   - Should return (true, "")

### Step 7: Save Deployment Results

Create `deployment-results.json`:
```json
{
  "network": "arbitrum-sepolia",
  "deployer": "0xb0eb4bfd410e6e9460ee7b3e4a960fd9eeda148b",
  "timestamp": "2024-01-XX",
  "contracts": [
    {
      "name": "AgentFactory",
      "address": "DEPLOYED_ADDRESS_HERE"
    },
    {
      "name": "RiskManager", 
      "address": "DEPLOYED_ADDRESS_HERE"
    }
  ]
}
```

## 🎉 Success Criteria

✅ AgentFactory deployed and can create agents
✅ RiskManager deployed and validates positions
✅ All contracts verified on Arbiscan (optional)
✅ Multi-agent trading system ready for testing

## 📞 Next Steps After Deployment

1. **Test agent creation**: Call `createAgent()` to mint first agent
2. **Configure risk profiles**: Set custom risk parameters
3. **Enable trading**: Add allowed targets to agent wallets
4. **Monitor performance**: Track agent trades and PnL

Your Aethelred Agent Factory is now live on Arbitrum Sepolia! 🚀