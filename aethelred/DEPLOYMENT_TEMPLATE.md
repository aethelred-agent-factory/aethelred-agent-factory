# Aethelred Sepolia Deployment Template

## 📋 Pre-Deployment Checklist

Before deploying, please fill in all the required information below and ensure you have:

- [ ] Arbitrum Sepolia ETH for gas fees (at least 0.1 ETH recommended)
- [ ] Private key for deployment wallet
- [ ] Verified all information below is correct

## 🔧 Required Information

### 1. Wallet Configuration

**Private Key** (with 0x prefix):
```
PRIVATE_KEY=0x[REPLACE_WITH_YOUR_64_CHARACTER_PRIVATE_KEY]
```

**Deployment Wallet Address** (for verification):
```
DEPLOYER_ADDRESS=0x[REPLACE_WITH_YOUR_WALLET_ADDRESS]
```

### 2. Network Configuration

**Network**: Arbitrum Sepolia (testnet)
**RPC URL**: https://sepolia-rollup.arbitrum.io/rpc
**Chain ID**: 421614
**Explorer**: https://sepolia.arbiscan.io

### 3. Token Configuration

**Initial AETHEL Token Supply** (default: 1,000,000):
```
INITIAL_SUPPLY=1000000
```

**Token Name**: Aethelred Token
**Token Symbol**: AETHEL
**Decimals**: 18

### 4. Protocol Parameters

**Minimum Executor Stake** (in AETHEL tokens):
```
MIN_EXECUTOR_STAKE=1000
```

**Challenge Period** (in seconds, default: 2 hours):
```
CHALLENGE_PERIOD=7200
```

**Default Task Bond** (in AETHEL tokens):
```
DEFAULT_TASK_BOND=100
```

**Quality Threshold** (0-100, default: 70):
```
QUALITY_THRESHOLD=70
```

## 📝 Deployment Information Form

Please fill in the following information:

### Personal/Project Information
```
PROJECT_NAME=[YOUR_PROJECT_NAME]
DEPLOYER_NAME=[YOUR_NAME_OR_ORGANIZATION]
CONTACT_EMAIL=[YOUR_EMAIL]
```

### Wallet Information
```
PRIVATE_KEY=0x[YOUR_PRIVATE_KEY_HERE]
DEPLOYER_ADDRESS=0x[YOUR_WALLET_ADDRESS_HERE]
```

### Custom Parameters (optional - leave defaults if unsure)
```
INITIAL_SUPPLY=1000000
MIN_EXECUTOR_STAKE=1000
CHALLENGE_PERIOD=7200
DEFAULT_TASK_BOND=100
QUALITY_THRESHOLD=70
```

### Node Configuration (for post-deployment setup)
```
NODE_OPERATOR_NAME=[YOUR_NODE_NAME]
PREFERRED_ROLES=[executor,verifier,finalizer,assessor]  # Choose roles you want to run
```

## 🔒 Security Checklist

- [ ] I have backed up my private key securely
- [ ] I understand this is testnet deployment (not mainnet)
- [ ] I have sufficient Arbitrum Sepolia ETH for deployment
- [ ] I have double-checked my private key format (64 hex chars with 0x prefix)
- [ ] I understand the contract addresses will be publicly visible
- [ ] I am ready to proceed with deployment

## 📋 Pre-Flight Verification

Please verify the following before confirming deployment:

### Wallet Balance Check
Check your wallet balance at: https://sepolia.arbiscan.io/address/[YOUR_WALLET_ADDRESS]

**Current ETH Balance**: [PLEASE_FILL_IN] ETH
**Minimum Required**: 0.1 ETH

### Gas Price Check
Current gas price can be checked at: https://arbiscan.io/gastracker

**Current Gas Price**: [PLEASE_FILL_IN] gwei (optional)

## 🚀 Deployment Confirmation

Once you have filled in all the required information above, please confirm:

```
I confirm that:
[X] All information above is correct
[X] I have sufficient ETH for deployment
[X] I understand this is a testnet deployment
[X] I am ready to proceed with deployment

CONFIRMATION: [YES/NO]
```

---

## 📤 Ready to Deploy?

Once you've filled in all the information above, paste your completed template back and I'll execute the deployment for you!

**Example of what to send back:**

```
PRIVATE_KEY=0x1234567890abcdef...
DEPLOYER_ADDRESS=0xabcdef123456...
INITIAL_SUPPLY=1000000
MIN_EXECUTOR_STAKE=1000
PROJECT_NAME=My Aethelred Network
DEPLOYER_NAME=John Doe
CONTACT_EMAIL=john@example.com
CONFIRMATION=YES
```

## 📊 Post-Deployment Information

After successful deployment, you'll receive:

1. **Contract Addresses**:
   - AethelToken contract address
   - AethelCore contract address

2. **Transaction Hashes**:
   - Token deployment transaction
   - Core contract deployment transaction

3. **Verification Links**:
   - Arbiscan explorer links for both contracts

4. **Configuration Files**:
   - Updated node configuration
   - Deployment summary JSON

5. **Next Steps Guide**:
   - How to verify contracts on Arbiscan
   - How to set up your node
   - How to populate the marketplace
   - How to start participating in the network

---

**⚠️ Important Notes:**

1. **Testnet Only**: This deployment is for Arbitrum Sepolia testnet
2. **Gas Costs**: Expect deployment to cost 0.05-0.1 ETH in gas fees
3. **Time**: Deployment typically takes 5-10 minutes
4. **Reversibility**: Contract deployment cannot be undone
5. **Backup**: Keep your private key and deployment info safe

Ready when you are! 🚀