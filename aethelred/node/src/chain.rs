//! chain.rs
//!
//! @author Aethelred Team
//! @notice This module provides the interface to the Aethelred smart contracts.
//! It uses `ethers::abigen` to create strongly-typed Rust bindings from the contract ABIs,
//! allowing the off-chain node to interact with the on-chain protocol safely and easily.

use crate::config::Config;
use ethers::prelude::*;
use std::sync::Arc;
use eyre::Result;

// Generate Rust bindings for the AethelCore smart contract.
abigen!(
    AethelCore,
    r#"[
        event TaskSubmitted(uint256 indexed task_id, address indexed user, bytes32 model_hash, bytes32 input_hash)
        event TaskExecuted(uint256 indexed task_id, address indexed executor, bytes32 result_hash)
        event TaskChallenged(uint256 indexed task_id, address indexed challenger, bytes32 challenger_assertion)
        event TaskFinalized(uint256 indexed task_id, bool slashed)
        event ModelRegistered(bytes32 indexed model_hash, address indexed provider, string model_uri, uint256 usage_fee)
        event ModelStaked(bytes32 indexed model_hash, address indexed staker, uint256 amount)
        event QualityAssessmentStarted(uint256 indexed task_id, address[] assessors)
        event QualityScoreSubmitted(uint256 indexed task_id, address indexed assessor, uint256 score)
        event QualityAssessmentCompleted(uint256 indexed task_id, uint256 average_score, bool passed)

        function stake(uint256 amount)
        function unstake()
        function execute_task(uint256 task_id, bytes32 result_hash)
        function challenge_task(uint256 task_id, bytes32 verifier_result_hash)
        function finalize_task(uint256 task_id)
        function register_model(bytes32 model_hash, string model_uri, uint256 usage_fee)
        function stake_model(bytes32 model_hash, uint256 amount)
        function submit_quality_score(uint256 task_id, uint256 score)

        function tasks(uint256 task_id) view returns (uint256 id, address user, bytes32 model_hash, bytes32 input_hash, bytes32 result_hash, uint8 status, address executor, uint256 bond, uint256 submission_timestamp)
        function executor_stakes(address executor) view returns (uint256)
        function models(bytes32 model_hash) view returns (address provider, string model_uri, uint256 usage_fee, uint256 total_stake, bool is_active, uint256 reputation_score)
        function quality_assessments(uint256 task_id) view returns (address[] assessors, uint256[] scores, uint256 average_score, bool completed)
        function token_address() view returns (address)
        function min_executor_stake() view returns (uint256)
        function challenge_period_seconds() view returns (uint256)
    ]"#,
    event_derives(serde::Deserialize, serde::Serialize)
);

// Generate Rust bindings for the AethelToken smart contract.
abigen!(
    AethelToken,
    r#"[
        function approve(address spender, uint256 amount) external returns (bool)
        function balance_of(address account) view returns (uint256)
        function transfer(address to, uint256 value) external returns (bool)
    ]"#
);

/// A type alias for the Ethers client, configured with a wallet for signing transactions.
pub type EthClient = SignerMiddleware<Provider<Http>, Wallet<k256::ecdsa::SigningKey>>;

/// @notice Sets up the Ethers client for interacting with the L2 blockchain.
/// @param config The node's configuration, containing the RPC URL and private key.
/// @return A thread-safe, shareable Ethers client instance.
pub async fn setup_client(config: &Config) -> Result<Arc<EthClient>> {
    let provider = Provider::<Http>::try_from(config.l2_rpc_url.clone())?;
    let chain_id = provider.get_chainid().await?.as_u64();
    
    let wallet = config.private_key.parse::<LocalWallet>()?.with_chain_id(chain_id);
    let client = SignerMiddleware::new(provider, wallet);
    
    Ok(Arc::new(client))
}
