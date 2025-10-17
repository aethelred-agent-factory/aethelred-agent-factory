# Aethelred Protocol API Reference

## Smart Contract APIs

### AethelCore Contract

The main protocol contract that handles task management, disputes, and quality assessment.

#### Core Functions

##### `submit_task(model_hash: B256, input_hash: B256, fee: U256) -> U256`

Submits a new AI computation task.

**Parameters:**
- `model_hash`: Hash of the AI model to use
- `input_hash`: Hash of the input data
- `fee`: Payment amount in AETHEL tokens

**Returns:** Task ID

**Events:** `TaskSubmitted(task_id, user, model_hash, input_hash)`

**Gas Cost:** ~150,000

---

##### `execute_task(task_id: U256, result_hash: B256)`

Submits the result for a task (executor only).

**Parameters:**
- `task_id`: ID of the task to execute
- `result_hash`: Hash of the computation result

**Events:** `TaskExecuted(task_id, executor, result_hash)`

**Requirements:**
- Caller must be a staked executor
- Task must be in `Pending` status

---

##### `challenge_task(task_id: U256, challenger_assertion: B256)`

Challenges a submitted task result (verifier only).

**Parameters:**
- `task_id`: ID of the task to challenge
- `challenger_assertion`: Challenger's claimed correct result

**Events:** `TaskChallenged(task_id, challenger, challenger_assertion)`

**Requirements:**
- Task must be in `Verifying` status
- Within challenge period
- Challenger must post bond

---

##### `finalize_task(task_id: U256)`

Finalizes a task after the challenge period.

**Parameters:**
- `task_id`: ID of the task to finalize

**Events:** `TaskFinalized(task_id, slashed)`

**Requirements:**
- Challenge period must have expired
- No active disputes

---

#### Model Marketplace Functions

##### `register_model(model_hash: B256, model_uri: String, usage_fee: U256)`

Registers a new AI model in the marketplace.

**Parameters:**
- `model_hash`: Unique hash identifier for the model
- `model_uri`: URI where the model can be accessed (e.g., IPFS, HTTP)
- `usage_fee`: Fee charged per inference in AETHEL tokens

**Events:** `ModelRegistered(model_hash, provider, model_uri, usage_fee)`

---

##### `stake_model(model_hash: B256, amount: U256)`

Stakes tokens on a model to increase its reputation.

**Parameters:**
- `model_hash`: Hash of the model to stake on
- `amount`: Amount of AETHEL tokens to stake

**Events:** `ModelStaked(model_hash, staker, amount)`

---

#### Quality Assessment Functions

##### `submit_quality_score(task_id: U256, score: U256)`

Submits a quality score for a completed task (assessor only).

**Parameters:**
- `task_id`: ID of the completed task
- `score`: Quality score (0-100)

**Events:** `QualityScoreSubmitted(task_id, assessor, score)`

**Requirements:**
- Caller must be selected as assessor
- Task must be completed
- Score must be between 0 and 100

---

#### Staking Functions

##### `stake(amount: U256)`

Stakes AETHEL tokens to become an executor.

**Parameters:**
- `amount`: Amount of tokens to stake

**Requirements:**
- Must approve token transfer first
- Minimum stake amount must be met

---

##### `unstake()`

Unstakes all tokens (if no active tasks).

**Requirements:**
- No active unresolved tasks
- Not currently executing any tasks

---

#### View Functions

##### `tasks(task_id: U256) -> TaskData`

Returns complete information about a task.

**Returns:**
```rust
struct TaskData {
    id: U256,
    user: Address,
    model_hash: B256,
    input_hash: B256,
    result_hash: B256,
    status: u8,
    executor: Address,
    bond: U256,
    submission_timestamp: U256,
    execution_timestamp: U256,
    quality_score: U256,
    quality_assessed: bool,
}
```

---

##### `models(model_hash: B256) -> ModelData`

Returns information about a registered model.

**Returns:**
```rust
struct ModelData {
    provider: Address,
    model_uri: String,
    usage_fee: U256,
    total_stake: U256,
    is_active: bool,
    reputation_score: U256,
}
```

---

##### `executor_stakes(executor: Address) -> U256`

Returns the stake amount for an executor.

---

##### `quality_assessments(task_id: U256) -> QualityAssessmentData`

Returns quality assessment data for a task.

**Returns:**
```rust
struct QualityAssessmentData {
    assessors: Vec<Address>,
    scores: Vec<U256>,
    average_score: U256,
    completed: bool,
}
```

---

### AethelToken Contract

Standard ERC-20 token with additional functionality.

#### Standard ERC-20 Functions

- `total_supply() -> U256`
- `balance_of(account: Address) -> U256`
- `transfer(to: Address, amount: U256) -> bool`
- `approve(spender: Address, amount: U256) -> bool`
- `transfer_from(from: Address, to: Address, amount: U256) -> bool`
- `allowance(owner: Address, spender: Address) -> U256`

---

## Node API

### Command Line Interface

#### Basic Commands

```bash
# Check node status
aethelred-node check [--config CONFIG_PATH]

# Run node in specific role
aethelred-node run <ROLE> [--config CONFIG_PATH]
# ROLE: executor | verifier | finalizer | assessor

# Stake tokens
aethelred-node stake --amount AMOUNT [--config CONFIG_PATH]

# Unstake tokens
aethelred-node unstake [--config CONFIG_PATH]

# Transfer tokens
aethelred-node transfer --to ADDRESS --amount AMOUNT [--config CONFIG_PATH]
```

#### Model Marketplace Commands

```bash
# Register a model
aethelred-node register-model \
    --model-hash HASH \
    --uri URI \
    --fee FEE \
    [--config CONFIG_PATH]

# Stake on a model
aethelred-node stake-model \
    --model-hash HASH \
    --amount AMOUNT \
    [--config CONFIG_PATH]
```

### Configuration File Format

```toml
[network]
name = "arbitrum-sepolia"
l2_rpc_url = "https://sepolia-rollup.arbitrum.io/rpc"
explorer_url = "https://sepolia.arbiscan.io"
chain_id = 421614

[contracts]
core_contract_address = "0x..."
token_contract_address = "0x..."

[wallet]
private_key = "your_private_key_here"

[node]
roles = ["executor"]
data_dir = "/path/to/data"
log_dir = "/path/to/logs"

[executor]
enabled = true
min_stake_amount = "1000"
max_concurrent_tasks = 3
computation_timeout = 300

[verifier]
enabled = false
challenge_probability = 0.1
verification_timeout = 180

[finalizer]
enabled = false
finalization_delay = 30

[quality_assessor]
enabled = false
assessment_timeout = 300
quality_threshold = 70

[logging]
level = "info"
format = "json"
```

---

## Events Reference

### Core Events

#### `TaskSubmitted`
```solidity
event TaskSubmitted(
    uint256 indexed task_id,
    address indexed user,
    bytes32 model_hash,
    bytes32 input_hash
);
```

#### `TaskExecuted`
```solidity
event TaskExecuted(
    uint256 indexed task_id,
    address indexed executor,
    bytes32 result_hash
);
```

#### `TaskChallenged`
```solidity
event TaskChallenged(
    uint256 indexed task_id,
    address indexed challenger,
    bytes32 challenger_assertion
);
```

#### `TaskFinalized`
```solidity
event TaskFinalized(
    uint256 indexed task_id,
    bool slashed
);
```

### Marketplace Events

#### `ModelRegistered`
```solidity
event ModelRegistered(
    bytes32 indexed model_hash,
    address indexed provider,
    string model_uri,
    uint256 usage_fee
);
```

#### `ModelStaked`
```solidity
event ModelStaked(
    bytes32 indexed model_hash,
    address indexed staker,
    uint256 amount
);
```

### Quality Assessment Events

#### `QualityAssessmentStarted`
```solidity
event QualityAssessmentStarted(
    uint256 indexed task_id,
    address[] assessors
);
```

#### `QualityScoreSubmitted`
```solidity
event QualityScoreSubmitted(
    uint256 indexed task_id,
    address indexed assessor,
    uint256 score
);
```

#### `QualityAssessmentCompleted`
```solidity
event QualityAssessmentCompleted(
    uint256 indexed task_id,
    uint256 average_score,
    bool passed
);
```

---

## Error Codes

### Contract Errors

| Error | Code | Description |
|-------|------|-------------|
| `InsufficientStake` | 1001 | Executor stake below minimum |
| `TaskNotFound` | 1002 | Task ID does not exist |
| `TaskNotInCorrectState` | 1003 | Task status prevents operation |
| `UnauthorizedCaller` | 1004 | Caller not authorized for operation |
| `InvalidParameters` | 1005 | Invalid function parameters |
| `InsufficientFunds` | 1006 | Insufficient token balance |
| `ModelNotFound` | 1007 | Model not registered |
| `InvalidQualityScore` | 1008 | Quality score out of range |
| `ChallengePeriodExpired` | 1009 | Challenge period has ended |
| `DisputeNotActive` | 1010 | No active dispute for task |

### Node Errors

| Error | Description |
|-------|-------------|
| `ConfigurationError` | Invalid configuration file |
| `NetworkError` | RPC connection failed |
| `ExecutionError` | AI model execution failed |
| `TransactionError` | Blockchain transaction failed |
| `InsufficientBalance` | Wallet balance too low |

---

## Gas Costs

| Operation | Estimated Gas | Notes |
|-----------|---------------|-------|
| `submit_task` | ~150,000 | Includes event emission |
| `execute_task` | ~120,000 | Updates task state |
| `challenge_task` | ~200,000 | Creates dispute |
| `finalize_task` | ~100,000 | Simple state update |
| `register_model` | ~180,000 | String storage expensive |
| `stake_model` | ~80,000 | Token transfer + update |
| `submit_quality_score` | ~70,000 | Quality update |
| `stake` | ~120,000 | Token transfer + stake |
| `unstake` | ~100,000 | Stake withdrawal |

---

## Rate Limits

### Network Limits
- Max tasks per block: 100
- Max challenges per block: 20
- Max quality assessments per block: 50

### Node Limits
- Max concurrent tasks per executor: 5
- Challenge rate: 10% of tasks (configurable)
- Quality assessment timeout: 5 minutes

---

## Integration Examples

### JavaScript/TypeScript

```typescript
import { ethers } from 'ethers';
import { AethelCore__factory } from './contracts';

const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = AethelCore__factory.connect(CONTRACT_ADDRESS, wallet);

// Submit a task
const tx = await contract.submit_task(
    modelHash,
    inputHash,
    ethers.utils.parseEther("10") // 10 AETHEL fee
);
const receipt = await tx.wait();
const taskId = receipt.events?.[0]?.args?.task_id;
```

### Python

```python
from web3 import Web3
from eth_account import Account

w3 = Web3(Web3.HTTPProvider(RPC_URL))
account = Account.from_key(PRIVATE_KEY)

# Contract interaction
contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)
tx = contract.functions.submit_task(
    model_hash,
    input_hash,
    Web3.toWei(10, 'ether')  # 10 AETHEL fee
).build_transaction({
    'from': account.address,
    'gas': 200000,
    'gasPrice': w3.toWei('20', 'gwei'),
    'nonce': w3.eth.get_transaction_count(account.address)
})

signed_tx = account.sign_transaction(tx)
tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
```

### Rust

```rust
use ethers::prelude::*;
use std::sync::Arc;

let provider = Provider::<Http>::try_from(rpc_url)?;
let wallet = LocalWallet::from_str(private_key)?;
let client = SignerMiddleware::new(provider, wallet);
let contract = AethelCore::new(contract_address, Arc::new(client));

// Submit task
let tx = contract.submit_task(model_hash, input_hash, fee_amount);
let pending_tx = tx.send().await?;
let receipt = pending_tx.await?;
```