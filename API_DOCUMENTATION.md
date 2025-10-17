# 🔌 Aethel Agent Factory API Documentation

## 📋 Overview

This document describes the API interfaces for the integrated Aethelred + Agent Factory system, including the integration bridge, enhanced agent controller, and configuration options.

## 🌉 Integration Bridge API

### `queryDecentralizedAI(marketData, config)`

Primary function for getting AI trading decisions with fallback support.

#### Parameters

```typescript
interface MarketData {
  timestamp: number;           // Unix timestamp
  symbol: string;             // Trading pair (e.g., "WETH/USDC")
  price: number;              // Current price in USD
  priceUSD?: number;          // Alternative price field
  volume?: number;            // 24h trading volume
  trend?: string;             // Market trend ("bullish", "bearish", "neutral")
  priceChange24h?: number;    // 24h price change percentage
  volatility?: number;        // Volatility measure (0-1)
  usdcBalance?: string;       // USDC balance in wei
  technicalIndicators?: {
    rsi?: number;             // RSI value (0-100)
    macd?: string;            // MACD signal ("positive", "negative")
    movingAverage?: string;   // MA position ("above", "below")
  };
}

interface Config {
  useAethelred?: boolean;          // Default: true
  fallbackToDeepSeek?: boolean;    // Default: true
  deepSeekApiKey?: string;         // API key for DeepSeek
  aethelredNodeUrl?: string;       // Default: "http://localhost:8080"
  timeout?: number;                // Default: 30000ms
  retryAttempts?: number;          // Default: 3
  fallbackEnabled?: boolean;       // Default: true
}
```

#### Response

```typescript
interface TradingDecision {
  action: "swap" | "hold" | "sell";     // Trading action
  amount: string;                       // Amount to trade (USDC)
  condition: string;                    // Price condition (e.g., "price>2100")
  confidence: number;                   // Confidence score (0-1)
  reasoning: string;                    // AI reasoning explanation
  source: "aethelred" | "deepseek" | "fallback";  // Decision source
  verified: boolean;                    // Cryptographic verification status
}
```

#### Example Usage

```javascript
import { queryDecentralizedAI } from './bridge/aethelred-integration.js';

const marketData = {
  timestamp: Date.now(),
  symbol: 'WETH/USDC',
  price: 2150.50,
  volume: 1234567,
  trend: 'bullish',
  priceChange24h: 5.2,
  technicalIndicators: {
    rsi: 65,
    macd: 'positive'
  }
};

const decision = await queryDecentralizedAI(marketData, {
  useAethelred: true,
  fallbackToDeepSeek: true,
  timeout: 15000
});

console.log(`Action: ${decision.action}, Confidence: ${decision.confidence}`);
```

#### Response Examples

**DeepSeek API Success:**
```json
{
  "action": "swap",
  "amount": "1000",
  "condition": "price <= $2155.0",
  "confidence": 0.7,
  "reasoning": "Bullish trend with positive MACD suggests upward momentum",
  "source": "deepseek",
  "verified": true
}
```

**Fallback Response:**
```json
{
  "action": "hold",
  "amount": "0",
  "condition": "",
  "confidence": 0.8,
  "reasoning": "Rule-based: Price below threshold or insufficient balance",
  "source": "fallback",
  "verified": false
}
```

## 🤖 Enhanced Agent Controller API

### `class EnhancedAgentController`

Main controller class for AI-powered trading agents.

#### Constructor

```javascript
const controller = new EnhancedAgentController(config);
```

**Config Options:**
```typescript
interface ControllerConfig {
  rpc?: string;                    // Default: "http://127.0.0.1:8545"
  useAethelred?: boolean;          // Default: true
  fallbackToDeepSeek?: boolean;    // Default: true
  deepSeekApiKey?: string;         // DeepSeek API key
  mintFee?: string;                // Default: "0.01" ETH
}
```

#### Methods

##### `makeDecision(marketData)`

Make a single trading decision based on market data.

```javascript
const decision = await controller.makeDecision({
  symbol: 'WETH/USDC',
  price: 2150.50,
  volume: 1000000,
  trend: 'bullish'
});
```

##### `simulateTrading(marketDataArray)`

Simulate trading across multiple market conditions.

```javascript
const marketConditions = [
  { price: 2100, trend: 'bearish' },
  { price: 2200, trend: 'bullish' },
  { price: 2150, trend: 'neutral' }
];

const results = await controller.simulateTrading(marketConditions);
```

##### `checkAgentStatus()`

Check the on-chain status of the trading agent.

```javascript
const status = await controller.checkAgentStatus();
console.log(`Agent exists: ${status.exists}`);
console.log(`Wallet address: ${status.walletAddress}`);
```

##### `getOnChainAddresses()`

Get the deployed contract addresses.

```javascript
const addresses = await controller.getOnChainAddresses();
console.log(`Factory: ${addresses.factoryAddr}`);
console.log(`Price Feed: ${addresses.priceFeedAddr}`);
console.log(`USDC: ${addresses.usdcAddr}`);
```

## 🔧 Configuration API

### Environment Variables

```bash
# Core Integration
USE_AETHELRED=true                    # Enable Aethelred integration
AETHELRED_FALLBACK=true              # Enable fallback systems
DEEPSEEK_API_KEY=sk-your-key         # DeepSeek API key

# Network Configuration  
AETHELRED_NODE_URL=http://localhost:8080
RPC_URL=http://127.0.0.1:8545

# Trading Parameters
SWAP_THRESHOLD=2100                   # Price threshold for swaps
DEFAULT_SWAP_AMOUNT=100              # Default USDC amount
CHECK_INTERVAL=20000                 # Check interval in ms

# Logging & Monitoring
LOG_LEVEL=debug                      # Log level (debug, info, warn, error)
```

### Configuration Files

#### `.env.test` (Test Environment)
```bash
DEEPSEEK_API_KEY=sk-3d94751067114380932cb022149b3e79
USE_AETHELRED=true
AETHELRED_FALLBACK=true
LOG_LEVEL=debug
```

#### `.env.production` (Production Environment)
```bash
DEEPSEEK_API_KEY=sk-production-key
USE_AETHELRED=true
AETHELRED_FALLBACK=false
RPC_URL=https://mainnet.infura.io/v3/your-project-id
LOG_LEVEL=info
```

## 🔄 Fallback System API

The system implements a 3-tier fallback approach:

### Tier 1: Aethelred Network
- **Status**: Stub implementation (network offline)
- **Features**: Cryptographic verification, quality scoring
- **Timeout**: 30 seconds

### Tier 2: DeepSeek API
- **Status**: ✅ Fully functional
- **Features**: GPT-4 level AI reasoning
- **Timeout**: 15 seconds
- **Rate Limits**: Standard API limits apply

### Tier 3: Rule-based Logic  
- **Status**: ✅ Always available
- **Features**: Mathematical trading rules
- **Timeout**: Instant

## 📊 Response Codes & Error Handling

### Success Responses

| Source | Verified | Description |
|--------|----------|-------------|
| `aethelred` | `true` | Cryptographically verified AI decision |
| `deepseek` | `true` | AI decision from DeepSeek API |
| `fallback` | `false` | Rule-based mathematical decision |

### Error Scenarios

```javascript
// Network timeout
{
  "error": "Aethelred network timeout",
  "fallback": "deepseek",
  "code": "NETWORK_TIMEOUT"
}

// API key invalid
{
  "error": "DeepSeek API authentication failed", 
  "fallback": "rule-based",
  "code": "API_AUTH_FAILED"
}

// JSON parsing error
{
  "error": "Invalid AI response format",
  "fallback": "rule-based", 
  "code": "PARSE_ERROR"
}
```

## 🧪 Testing API

### Integration Test Commands

```bash
# Full integration test
node test-integration.js

# DeepSeek API specific test
node test-deepseek.js

# Rust contract tests
cargo test --package aethel-core --package aethel-token
```

### Test Response Validation

```javascript
// Expected successful response structure
const isValidResponse = response && 
                       response.source &&
                       response.action &&
                       typeof response.confidence === 'number' &&
                       response.confidence >= 0 && 
                       response.confidence <= 1;
```

## 🚀 Deployment API

### NPM Scripts

```bash
npm run build              # Build all components
npm run deploy            # Deploy contracts
npm run start:enhanced    # Start enhanced controller
npm run test:integration  # Run integration tests
npm run monitor          # Monitor agent status
```

### Makefile Commands

```bash
make install             # Install all dependencies
make build              # Build Rust + JavaScript
make deploy             # Deploy both systems  
make test               # Run all tests
make integration        # Run integration tests
make monitor            # Monitor system health
```

## 🔐 Security Considerations

### API Key Management
- Store DeepSeek API key in environment variables
- Use different keys for test/production environments
- Implement key rotation policies

### Network Security
- Validate all input parameters
- Implement rate limiting for API calls
- Use timeouts to prevent hanging requests

### Smart Contract Security
- Contracts use OpenZeppelin patterns
- Access controls implemented
- Proxy upgrade patterns for future updates

---

## 📝 Changelog

### v1.0.0 (2025-10-17)
- ✅ Initial integration complete
- ✅ DeepSeek API integration working
- ✅ Enhanced agent controller implemented
- ✅ Comprehensive test suite passing
- ✅ Fallback system operational

---

**For additional support or questions, please refer to the main README.md or create an issue in the repository.**