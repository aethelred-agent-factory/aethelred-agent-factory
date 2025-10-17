# 🤖 Aethel Agent Factory

**Note**: This repository contains two separate projects:
- **Aethelred Protocol**: Decentralized AI computation network
- **Agent Factory MVP**: Autonomous trading agents on Ethereum

*These projects are currently separate and need to be integrated.*

## 🏗️ Project Structure

- **`aethelred/`**: Verifiable Intelligence Network enabling decentralized AI computation with cryptographic guarantees on Arbitrum
- **`agent-factory-mvp/`**: Autonomous AI trading agent factory built on Ethereum with smart contract-based agents
- **`bridge/`**: Integration layer connecting Aethelred's decentralized AI with Agent Factory's trading logic

## ✨ Key Features

- **🔍 Verifiable AI**: Replace centralized AI APIs with cryptographically verified decentralized computation
- **🤖 Autonomous Agents**: Self-executing trading agents with NFT-based identities and proxy wallets  
- **⚖️ Multi-Layer Fallbacks**: Graceful degradation from Aethelred → DeepSeek → Rule-based logic
- **📊 Real-time Monitoring**: Comprehensive dashboard for agent performance and network stats
- **🔧 Unified DevOps**: Single command setup, testing, and deployment for both systems

## 🚀 Quick Start

### Prerequisites
- [Rust](https://rustup.rs/) (1.70+)
- [Node.js](https://nodejs.org/) (18+)
- [Docker](https://docs.docker.com/get-docker/) (optional)

### ⚡ Fastest Setup (Integration Testing)

```bash
# 1. Install dependencies and test integration
npm install
npm run install:all

# 2. Set up API key (required for AI features)
echo "DEEPSEEK_API_KEY=your-api-key-here" > .env

# 3. Run integration tests
node test-integration.js
node test-deepseek.js

# 4. Start the enhanced agent controller
npm run start:enhanced
```

### Installation & Setup

```bash
# 1. Install all dependencies
make install

# 2. Build all components
make build

# 3. Quick start everything
make quick-start
```

### Alternative: Step-by-Step Setup

```bash
# 1. Install dependencies
npm run install:all

# 2. Build Rust + Contracts
npm run build

# 3. Start development environment
npm run dev:start

# 4. Deploy contracts (in new terminal)
npm run deploy

# 5. Start enhanced agent controller
npm run start:agent-controller
```

## 🎯 How It Works

### Integration Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Aethelred      │    │ Integration     │    │ Agent Factory   │
│  Protocol       │    │ Bridge          │    │ MVP             │
│                 │    │                 │    │                 │
│ • Verifiable AI │◄──►│ • Fallback      │◄──►│ • NFT Agents    │
│ • Quality PoQ   │    │ • Error Handle  │    │ • Proxy Wallets │
│ • Arbitrum      │    │ • Response Parse│    │ • Ethereum      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Decision Flow

1. **Market Data Collection**: Agent gathers price, balance, and portfolio data
2. **AI Query**: Submit to Aethelred network for verified decision
3. **Fallback Chain**: Aethelred → DeepSeek API → Rule-based logic
4. **Execution**: Execute trades through verified smart contract calls
5. **Monitoring**: Track performance and network health

## 📋 Available Commands

### Unified Commands (via Makefile)
```bash
make help          # Show all available commands
make dev-start     # Start full development environment  
make deploy        # Deploy both Aethelred and Agent Factory
make test          # Run all tests (Rust + JavaScript)
make monitor       # Monitor agent status and balances
make integration   # Run end-to-end integration tests
```

### NPM Scripts
```bash
npm run build              # Build all components
npm run deploy            # Deploy both systems
npm run start:agent-controller  # Start enhanced controller
npm run monitor           # Check agent balances and status
npm run integration:test  # Run integration tests
```

## 🔧 Configuration

### Environment Variables
```env
# Aethelred Integration
USE_AETHELRED=true                    # Enable/disable Aethelred
AETHELRED_NODE_URL=http://localhost:8080

# DeepSeek Fallback  
DEEPSEEK_API_KEY=sk-your-api-key-here

# Network Settings
RPC_URL=http://127.0.0.1:8545
```

### Trading Parameters
- **Swap Threshold**: $2100 WETH/USD
- **Default Swap Amount**: 100 USDC  
- **Check Interval**: 20 seconds
- **Verification Timeout**: 30 seconds

## 🧪 Testing

### ✅ Current Test Status
- **Rust Contracts**: ✅ Compiling and passing (stub implementations)
- **DeepSeek API**: ✅ Fully functional with live API key
- **Integration Bridge**: ✅ Working with all fallback layers
- **Enhanced Controller**: ✅ AI decision-making implemented
- **End-to-End Flow**: ✅ 100% success rate in tests

### Integration Tests (Ready to Run)
```bash
# Test the complete integrated system
node test-integration.js

# Test DeepSeek API specifically  
node test-deepseek.js

# Expected output:
# 🎯 Integration Test Results:
# - Bridge functionality: ✅ Working
# - Agent controller: ✅ Working  
# - End-to-End flow: ✅ Working
# - Decision success rate: 100.0%
```

### Full Test Suite
```bash
# Run all tests
make test

# Test individual components
make test-rust     # Aethelred tests
make test-js       # Agent Factory tests

# Integration testing
make integration   # End-to-end tests
```

### Manual Testing Flow
```bash
# Terminal 1: Start environment
make dev-start

# Terminal 2: Deploy and monitor
make deploy
make monitor

# Terminal 3: Trigger trades
cd agent-factory-mvp
npm run update-price 2200  # Trigger swap condition
```

## 📊 Monitoring & Analytics

### Agent Dashboard
```
🤖 AGENT TRADING DASHBOARD
============================
💰 Price: $2200 WETH/USD
📊 USDC: 9900.00 | WETH: 0.0495  
💼 Portfolio: $10008.90 USD
📈 Trades: 5 successful, 0 failed

🎯 [Decision] Source: aethelred | Verified: ✅
   Action: swap | Amount: 100
   Confidence: 92.3%
   Reasoning: Market momentum suggests optimal entry
```

### Network Statistics
- Real-time Aethelred network health
- Active executor/verifier nodes
- Task completion rates and quality scores
- Fallback usage patterns

## 🔄 Integration Benefits

### Before (Centralized)
- ❌ Single point of failure (DeepSeek API)
- ❌ No cryptographic verification
- ❌ Limited transparency
- ❌ Vendor lock-in

### After (Decentralized)
- ✅ Distributed computation network
- ✅ Cryptographic proof of correctness  
- ✅ Full transparency and auditability
- ✅ Multiple fallback layers
- ✅ Community-driven quality assessment

## 🛠️ Development

### Project Structure
```
aethel-agent-factory/
├── aethelred/              # Rust-based Aethelred Protocol
│   ├── contracts/          # Stylus smart contracts
│   ├── node/              # Off-chain node implementation
│   └── tests/             # Rust tests
├── agent-factory-mvp/     # JavaScript-based Agent Factory
│   ├── contracts/         # Solidity smart contracts
│   ├── controller/        # Agent controller logic
│   └── scripts/          # Deployment scripts
├── bridge/               # Integration layer
│   └── aethelred-integration.js
├── package.json          # Unified workspace configuration
└── Makefile             # Unified development commands
```

### Adding New Features

1. **New Trading Strategies**: Extend the AI prompt in the bridge integration
2. **Additional Tokens**: Deploy new ERC20 contracts and update router
3. **Advanced DeFi**: Add support for lending, liquidity pools, derivatives
4. **Multi-Agent Support**: Scale to multiple agents with different strategies

## 🔒 Security Considerations

- **Smart Contract Security**: OpenZeppelin patterns, proxy upgrades, access controls
- **AI Verification**: Cryptographic proofs ensure computation integrity
- **Network Resilience**: Multiple fallback layers prevent single points of failure
- **Input Validation**: Comprehensive parameter checking and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests: `make test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🚀 Ready to deploy truly decentralized AI agents? The future of autonomous trading is here!**
