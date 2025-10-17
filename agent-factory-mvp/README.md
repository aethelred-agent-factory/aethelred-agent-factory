# 🤖 Agent Factory MVP

An autonomous AI trading agent factory built on Ethereum that creates, manages, and operates intelligent trading wallets using smart contracts and AI decision-making.

## ✨ Features

- **🏭 Agent Factory**: Mint NFT-based AI trading agents with unique proxy wallets
- **🧠 AI Decision Making**: Integration with DeepSeek AI for intelligent trading decisions
- **🔄 Autonomous Trading**: Agents execute trades based on market conditions
- **📊 Portfolio Tracking**: Real-time monitoring of agent balances and performance
- **🛡️ Secure Execution**: Proxy pattern for upgradeable agent wallets with access controls
- **⚡ Fallback Trading**: Rule-based trading when AI is unavailable

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Controller │    │  Agent Factory  │    │  Mock DEX/DeFi  │
│                 │    │                 │    │                 │
│ • DeepSeek API  │◄──►│ • ERC721 Agents │◄──►│ • USDC/WETH     │
│ • Price Monitor │    │ • Proxy Wallets │    │ • Price Feed    │
│ • Trade Logic   │    │ • Access Control│    │ • Router        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- npm or yarn
- DeepSeek API key (optional - has fallback)

### Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Start local blockchain
npm run node

# 3. Deploy contracts (in new terminal)
npm run deploy

# 4. Set up environment variables
echo "DEEPSEEK_API_KEY=your_api_key_here" > .env

# 5. Start the AI agent controller
npm run start-controller
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npm run node` | Start Hardhat local blockchain |
| `npm run deploy` | Deploy all contracts to localhost |
| `npm run start-controller` | Start the AI agent controller |
| `npm run monitor` | Check agent balances and status |
| `npm run update-price [price]` | Set WETH price (triggers trades if >$2100) |
| `npm run test-trading` | Run automated trading test |
| `npm run mint-tokens` | Mint additional USDC to deployer |

## 🎮 How to Test

### Basic Test Flow
```bash
# Terminal 1: Start blockchain
npm run node

# Terminal 2: Deploy & start controller
npm run deploy
npm run start-controller

# Terminal 3: Test trading
npm run update-price 2200  # Trigger a swap
npm run monitor           # Check results
```

### Automated Test
```bash
npm run test-trading
```

## 🔧 Smart Contracts

### AgentFactory.sol
- **ERC721-based agent minting**
- **Minimal proxy pattern for gas efficiency**
- **Configurable mint fees**
- **Owner controls**

### AgentWallet.sol  
- **Proxy wallet for each agent**
- **Execute arbitrary calls to approved targets**
- **Owner-controlled access management**
- **Initialization pattern**

### Mock Contracts
- **MockERC20**: USDC/WETH tokens
- **MockRouter**: Simple DEX for swapping
- **MockPriceFeed**: Controllable price oracle

## 🧠 AI Integration

The system integrates with DeepSeek AI to make trading decisions:

### Decision Process
1. **Market Data**: Price, balances, portfolio value
2. **AI Analysis**: DeepSeek processes market conditions  
3. **Action Execution**: Swap decisions executed on-chain
4. **Fallback Logic**: Rule-based trading if AI fails

### Example AI Response
```json
{
  "action": "swap",
  "amount": "100", 
  "condition": "price>2100"
}
```

## 📊 Monitoring

### Real-time Dashboard
```bash
npm run monitor
```

Output:
```
🤖 AGENT MONITORING DASHBOARD
================================
Agent Wallet: 0x61c36a8d610163660E21a8b7359e1Cac0C9133e1
USDC Balance: 9900.0 USDC
WETH Balance: 0.0495 WETH
Current WETH Price: $2200.0
Portfolio Value: $10008.90 USD
- USDC: $9900.00 (98.9%)
- WETH: $108.90 (1.1%)
🚀 Trading Signal: PRICE > $2100 - Agent should SWAP
================================
```

### Controller Logs
```
🤖 [TICK] Agent Status:
   Price: $2200 WETH/USD
   USDC: 9900.00 | WETH: 0.0495
   Portfolio: $10008.90 USD
   🧠 DeepSeek decision: {"action":"swap","amount":"100","condition":"price>2100"}
   🔄 Executing swap: 100.0 USDC → WETH
   ✅ Swap completed! TX: 0x...
```

## 🔧 Configuration

### Environment Variables
```env
DEEPSEEK_API_KEY=sk-your-api-key-here
```

### Trading Parameters
- **Swap Threshold**: $2100 WETH/USD
- **Default Swap Amount**: 100 USDC
- **Check Interval**: 20 seconds
- **Mint Fee**: 0.01 ETH

## 🛠️ Development

### Project Structure
```
├── contracts/           # Smart contracts
│   ├── AgentFactory.sol
│   ├── AgentWallet.sol
│   └── Mock*.sol
├── controller/          # AI controller
│   └── agent_controller.js
├── scripts/             # Deployment & utilities
│   ├── deploy_and_write.js
│   ├── monitor_agent.js
│   ├── update_price.js
│   └── test_trading.js
├── hardhat.config.cjs   # Hardhat configuration
└── package.json
```

### Adding New Features

1. **New Trading Strategies**: Modify the AI prompt in `agent_controller.js`
2. **Additional Tokens**: Deploy new MockERC20 contracts
3. **Complex DeFi**: Add more sophisticated DEX interactions
4. **Multi-Agent**: Mint multiple agents with different strategies

## 🚨 Important Notes

- **Testnet Only**: This is a development/testing system
- **Mock Contracts**: Uses simplified DeFi protocols
- **API Dependencies**: DeepSeek API required for full AI functionality
- **Gas Costs**: Agent operations consume gas from the deployer account

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**🚀 Happy Trading! The agents are ready to make some autonomous trades!**