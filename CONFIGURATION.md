# ⚙️ Aethel Agent Factory Configuration Guide

## 📋 Overview

This guide covers all configuration options for the integrated Aethelred + Agent Factory system, including environment variables, runtime parameters, and deployment settings.

## 🔧 Environment Configuration

### 🔑 Core API Keys

```bash
# Required: DeepSeek API Key for AI trading decisions
DEEPSEEK_API_KEY=sk-3d94751067114380932cb022149b3e79

# Optional: OpenAI key for alternative AI provider
OPENAI_API_KEY=sk-openai-key-here
```

### 🌐 Network Settings

```bash
# Ethereum/Local Network
RPC_URL=http://127.0.0.1:8545        # Local Hardhat node
RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID  # Mainnet
RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID  # Sepolia testnet

# Aethelred Network
AETHELRED_NODE_URL=http://localhost:8080      # Local Aethelred node
AETHELRED_NODE_URL=https://api.aethelred.ai   # Production network
```

### 🤖 AI & Integration Settings

```bash
# Aethelred Integration
USE_AETHELRED=true              # Enable Aethelred protocol integration
AETHELRED_FALLBACK=true         # Enable fallback to DeepSeek/rules
AETHELRED_TIMEOUT=30000         # Network timeout in milliseconds
AETHELRED_RETRY_ATTEMPTS=3      # Number of retry attempts

# DeepSeek API Configuration
DEEPSEEK_TIMEOUT=15000          # API timeout in milliseconds
DEEPSEEK_MAX_TOKENS=300         # Maximum response tokens
DEEPSEEK_TEMPERATURE=0.7        # AI creativity (0.0-1.0)

# Fallback Behavior
ENABLE_RULE_FALLBACK=true       # Enable mathematical fallback
FALLBACK_CONFIDENCE=0.8         # Confidence for rule-based decisions
```

### 💰 Trading Parameters

```bash
# Price & Amount Settings
SWAP_THRESHOLD=2100             # Price threshold for WETH swaps (USD)
DEFAULT_SWAP_AMOUNT=100         # Default USDC amount for swaps
MIN_USDC_BALANCE=50             # Minimum USDC to maintain
MAX_SWAP_AMOUNT=1000            # Maximum single swap amount

# Timing & Intervals
CHECK_INTERVAL=20000            # Price check interval (ms)
DECISION_TIMEOUT=10000          # Max time for AI decision (ms)
EXECUTION_DELAY=1000            # Delay between decisions (ms)
```

### 📊 Monitoring & Logging

```bash
# Logging Configuration
LOG_LEVEL=debug                 # Log level: debug, info, warn, error
LOG_FORMAT=json                 # Log format: json, text
LOG_FILE=./logs/agent.log       # Log file path
ENABLE_CONSOLE_LOG=true         # Enable console output

# Metrics & Analytics
ENABLE_METRICS=true             # Enable performance metrics
METRICS_PORT=3001               # Metrics server port
DASHBOARD_PORT=3000             # Web dashboard port
```

### 🔒 Security Settings

```bash
# Wallet & Keys
PRIVATE_KEY=0x1234...           # Trading wallet private key
MNEMONIC="your twelve word..."  # Alternative: mnemonic phrase
WALLET_PASSWORD=secure_password # Wallet encryption password

# Contract Security
MINT_FEE=0.01                   # Agent minting fee in ETH
ADMIN_ADDRESS=0x1234...         # Admin address for contracts
UPGRADE_DELAY=86400             # Upgrade delay in seconds (1 day)
```

### 🎯 Performance Tuning

```bash
# Optimization Settings
ENABLE_CACHING=true             # Enable response caching
CACHE_TTL=300                   # Cache time-to-live (seconds)
MAX_CONCURRENT_DECISIONS=3      # Max parallel AI decisions
BATCH_SIZE=10                   # Batch size for bulk operations

# Resource Limits
MAX_MEMORY_MB=512               # Maximum memory usage
CPU_LIMIT=80                    # CPU usage limit (percentage)
DISK_SPACE_THRESHOLD=90         # Disk space warning threshold
```

## 📁 Configuration Files

### `.env` (Development)
```bash
# Development Environment Configuration
NODE_ENV=development
LOG_LEVEL=debug

# API Keys
DEEPSEEK_API_KEY=sk-3d94751067114380932cb022149b3e79

# Network Settings
RPC_URL=http://127.0.0.1:8545
AETHELRED_NODE_URL=http://localhost:8080

# Integration Settings
USE_AETHELRED=true
AETHELRED_FALLBACK=true

# Trading Settings
SWAP_THRESHOLD=2100
DEFAULT_SWAP_AMOUNT=100
CHECK_INTERVAL=20000

# Development Features
ENABLE_CONSOLE_LOG=true
ENABLE_METRICS=true
```

### `.env.test` (Testing)
```bash
# Test Environment Configuration
NODE_ENV=test
LOG_LEVEL=debug

# Test API Keys
DEEPSEEK_API_KEY=sk-3d94751067114380932cb022149b3e79

# Local Test Network
RPC_URL=http://127.0.0.1:8545
AETHELRED_NODE_URL=http://localhost:8080

# Fast Test Settings
USE_AETHELRED=false             # Skip Aethelred for faster tests
AETHELRED_FALLBACK=true
DEEPSEEK_TIMEOUT=5000           # Shorter timeout for tests
CHECK_INTERVAL=5000             # Faster intervals

# Test Trading Parameters
SWAP_THRESHOLD=2000             # Lower threshold for tests
DEFAULT_SWAP_AMOUNT=10          # Smaller amounts for safety
```

### `.env.production` (Production)
```bash
# Production Environment Configuration
NODE_ENV=production
LOG_LEVEL=info

# Production API Keys (use secure key management)
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
PRIVATE_KEY=${PRIVATE_KEY}

# Production Networks
RPC_URL=https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}
AETHELRED_NODE_URL=https://api.aethelred.ai

# Production Security
USE_AETHELRED=true
AETHELRED_FALLBACK=false        # Stricter fallback policy
ENABLE_METRICS=true
LOG_FILE=/var/log/aethel-agent.log

# Production Trading (conservative settings)
SWAP_THRESHOLD=2200             # Higher threshold for safety
DEFAULT_SWAP_AMOUNT=500         # Moderate amounts
MAX_SWAP_AMOUNT=2000           # Reasonable upper limit
CHECK_INTERVAL=60000           # Slower, more stable intervals
```

## 🏗️ Build Configuration

### Cargo.toml (Rust Configuration)
```toml
[workspace]
resolver = "2"
members = [
    "node",
    "contracts/aethel_token", 
    "contracts/aethel_core",
]

[workspace.dependencies]
# Core Dependencies
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
eyre = "0.6.8"

# Commented out for stub implementation
# stylus-sdk = { version = "0.10.0-beta.1", features = ["export-abi"] }
# alloy-primitives = "0.7.2"
```

### hardhat.config.js (Solidity Configuration)
```javascript
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL, 
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

## 🎛️ Runtime Configuration

### Bridge Configuration
```javascript
const bridgeConfig = {
  useAethelred: process.env.USE_AETHELRED !== 'false',
  fallbackToDeepSeek: process.env.AETHELRED_FALLBACK !== 'false',
  deepSeekApiKey: process.env.DEEPSEEK_API_KEY,
  aethelredNodeUrl: process.env.AETHELRED_NODE_URL || 'http://localhost:8080',
  timeout: parseInt(process.env.AETHELRED_TIMEOUT) || 30000,
  retryAttempts: parseInt(process.env.AETHELRED_RETRY_ATTEMPTS) || 3
};
```

### Controller Configuration
```javascript
const controllerConfig = {
  rpc: process.env.RPC_URL || 'http://127.0.0.1:8545',
  useAethelred: process.env.USE_AETHELRED !== 'false',
  fallbackToDeepSeek: process.env.AETHELRED_FALLBACK !== 'false',
  deepSeekApiKey: process.env.DEEPSEEK_API_KEY,
  mintFee: process.env.MINT_FEE || '0.01'
};
```

## 🚀 Deployment Configuration

### Local Development
```bash
# Start local development environment
npm run dev:setup
npm run node                    # Terminal 1: Hardhat node
npm run start:aethelred-node   # Terminal 2: Aethelred node (stub)
npm run deploy                 # Terminal 3: Deploy contracts
npm run start:enhanced         # Terminal 4: Start agent controller
```

### Production Deployment
```bash
# Production deployment checklist
export NODE_ENV=production
export DEEPSEEK_API_KEY=sk-production-key
export RPC_URL=https://mainnet.infura.io/v3/project-id
export PRIVATE_KEY=0x...

# Deploy to production
npm run build
npm run deploy:production
npm run start:production
```

## 🔍 Configuration Validation

### Environment Validation Script
```javascript
// scripts/validate-config.js
function validateConfig() {
  const required = ['DEEPSEEK_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    process.exit(1);
  }
  
  console.log('✅ Configuration validation passed');
}
```

### Health Check Endpoints
```bash
# Check configuration health
curl http://localhost:3001/health
curl http://localhost:3001/config
curl http://localhost:3001/metrics
```

## 🛠️ Troubleshooting Configuration

### Common Issues

#### 1. DeepSeek API Key Issues
```bash
# Test API key
curl -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
     https://api.deepseek.com/v1/models

# Expected response: 200 OK with model list
```

#### 2. Network Connection Issues
```bash
# Test RPC connection
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Test Aethelred node
curl $AETHELRED_NODE_URL/api/v1/health
```

#### 3. Rust Compilation Issues
```bash
# Clean and rebuild
cd aethelred
cargo clean
cargo build --release

# Check for version conflicts
cargo tree | grep -E "(stylus|alloy)"
```

### Configuration Debugging
```bash
# Enable debug logging
export LOG_LEVEL=debug
export ENABLE_CONSOLE_LOG=true

# Run with debug output
npm run start:enhanced

# Check specific configuration values
node -e "console.log(process.env.DEEPSEEK_API_KEY?.slice(0,10) + '...')"
```

## 📚 Configuration Examples

### Minimal Test Setup
```bash
export DEEPSEEK_API_KEY=sk-3d94751067114380932cb022149b3e79
export USE_AETHELRED=false
npm run test:integration
```

### Full Production Setup
```bash
export NODE_ENV=production
export DEEPSEEK_API_KEY=sk-production-key
export RPC_URL=https://mainnet.infura.io/v3/project-id
export AETHELRED_NODE_URL=https://api.aethelred.ai
export USE_AETHELRED=true
export AETHELRED_FALLBACK=false
export LOG_LEVEL=info
export ENABLE_METRICS=true
npm run deploy
npm run start:enhanced
```

---

## 🎯 Quick Configuration Checklist

- [ ] ✅ DEEPSEEK_API_KEY set and valid
- [ ] ✅ RPC_URL configured for target network  
- [ ] ✅ Trading parameters set appropriately
- [ ] ✅ Logging level configured
- [ ] ✅ Security settings reviewed
- [ ] ✅ All tests passing
- [ ] ✅ Network connectivity verified

**Need help?** Check the main README.md or API_DOCUMENTATION.md for more details.