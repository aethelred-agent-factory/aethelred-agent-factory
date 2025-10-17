//! executor.rs
//!
//! @author Aethelred Team
//! @notice This is the main logic for an Aethelred node running in the "Executor" role.
//! Executors listen for new `TaskSubmitted` events, perform the requested AI computation off-chain,
//! and submit the resulting hash to the `AethelCore` contract.

use crate::chain::{AethelCore, EthClient};
use ethers::utils::format_units;
use ethers::prelude::*;
use std::sync::Arc;
use eyre::Result;
use sha3::{Digest, Keccak256};
use tokio::time::{sleep, Duration};
use tracing::{info, error, warn};

/// @notice Enhanced AI model execution that simulates different types of AI models.
/// @dev This enhanced version includes:
/// 1. Model type detection based on model_hash patterns
/// 2. Different computation strategies for different model types
/// 3. Realistic computation timing simulation
/// 4. Quality-aware result generation
/// 5. Model-specific error handling
#[derive(Debug, Clone)]
enum ModelType {
    TextGeneration,
    ImageClassification,
    SentimentAnalysis,
    CodeCompletion,
    Unknown,
}

impl ModelType {
    fn from_hash(model_hash: [u8; 32]) -> Self {
        // Use hash patterns to determine model type
        match model_hash[0] % 4 {
            0 => ModelType::TextGeneration,
            1 => ModelType::ImageClassification,
            2 => ModelType::SentimentAnalysis,
            3 => ModelType::CodeCompletion,
            _ => ModelType::Unknown,
        }
    }

    fn computation_time_ms(&self) -> u64 {
        match self {
            ModelType::TextGeneration => 2000,
            ModelType::ImageClassification => 800,
            ModelType::SentimentAnalysis => 300,
            ModelType::CodeCompletion => 1500,
            ModelType::Unknown => 1000,
        }
    }
}

async fn execute_ai_model(
    task_id: U256,
    model_hash: [u8; 32],
    input_hash: [u8; 32],
    contract: &AethelCore<EthClient>,
) -> Result<(Vec<u8>, u32)> {
    let model_type = ModelType::from_hash(model_hash);

    info!(
        "[Task {}] Executing AI model ({:?})... model_hash: 0x{}, input_hash: 0x{}",
        task_id,
        model_type,
        hex::encode(model_hash),
        hex::encode(input_hash)
    );

    // Check if model is registered and get its metadata
    let model_info = match contract.models(model_hash.into()).await {
        Ok(info) => {
            info!("[Task {}] Model found in registry: provider={:?}, fee={}, reputation={}",
                  task_id, info.0, info.2, info.5);
            Some(info)
        },
        Err(_) => {
            warn!("[Task {}] Model not found in registry, using default parameters", task_id);
            None
        }
    };

    // Simulate realistic computation time
    let computation_time = model_type.computation_time_ms();
    info!("[Task {}] Starting computation, estimated time: {}ms", task_id, computation_time);
    sleep(Duration::from_millis(computation_time)).await;

    // Generate model-specific results
    let result_data = match model_type {
        ModelType::TextGeneration => simulate_text_generation(model_hash, input_hash),
        ModelType::ImageClassification => simulate_image_classification(model_hash, input_hash),
        ModelType::SentimentAnalysis => simulate_sentiment_analysis(model_hash, input_hash),
        ModelType::CodeCompletion => simulate_code_completion(model_hash, input_hash),
        ModelType::Unknown => simulate_generic_computation(model_hash, input_hash),
    };

    // Calculate quality score based on model type and reputation
    let base_quality = 75 + (model_hash[1] % 20) as u32; // 75-94 base quality
    let reputation_bonus = if let Some(info) = model_info {
        (info.5.as_u32() / 10).min(5) // Up to 5 points from reputation
    } else {
        0
    };

    let quality_score = (base_quality + reputation_bonus).min(100);

    // Introduce errors for testing (every 5th task)
    let (final_result, actual_quality) = if task_id.as_u64() % 5 == 0 {
        warn!("[Task {}] Simulating computation error for testing", task_id);
        let mut corrupted = result_data.clone();
        corrupted[0] = corrupted[0].wrapping_add(1); // Introduce subtle error
        (corrupted, quality_score.saturating_sub(30))
    } else {
        (result_data, quality_score)
    };

    info!("[Task {}] Computation completed. Quality score: {}", task_id, actual_quality);
    Ok((final_result, actual_quality))
}

fn simulate_text_generation(model_hash: [u8; 32], input_hash: [u8; 32]) -> Vec<u8> {
    let mut hasher = Keccak256::new();
    hasher.update(b"text_gen:");
    hasher.update(model_hash);
    hasher.update(input_hash);

    // Simulate generating text tokens
    let num_tokens = 10 + (input_hash[0] % 20) as usize;
    for i in 0..num_tokens {
        hasher.update(&(i as u32).to_le_bytes());
        hasher.update(&model_hash[i % 32..((i + 4) % 32).min(32)]);
    }

    hasher.finalize().to_vec()
}

fn simulate_image_classification(model_hash: [u8; 32], input_hash: [u8; 32]) -> Vec<u8> {
    let mut hasher = Keccak256::new();
    hasher.update(b"img_class:");
    hasher.update(model_hash);
    hasher.update(input_hash);

    // Simulate classification probabilities for 1000 classes
    for class_id in 0..1000u32 {
        let prob_seed = class_id.wrapping_mul(input_hash[0] as u32);
        hasher.update(&prob_seed.to_le_bytes());
    }

    hasher.finalize().to_vec()
}

fn simulate_sentiment_analysis(model_hash: [u8; 32], input_hash: [u8; 32]) -> Vec<u8> {
    let mut hasher = Keccak256::new();
    hasher.update(b"sentiment:");
    hasher.update(model_hash);
    hasher.update(input_hash);

    // Simulate sentiment scores (positive, negative, neutral)
    let sentiment_weights = [
        input_hash[0] as f32 / 255.0,
        input_hash[1] as f32 / 255.0,
        input_hash[2] as f32 / 255.0,
    ];

    for weight in sentiment_weights.iter() {
        hasher.update(&weight.to_le_bytes());
    }

    hasher.finalize().to_vec()
}

fn simulate_code_completion(model_hash: [u8; 32], input_hash: [u8; 32]) -> Vec<u8> {
    let mut hasher = Keccak256::new();
    hasher.update(b"code_complete:");
    hasher.update(model_hash);
    hasher.update(input_hash);

    // Simulate multiple completion candidates
    let num_completions = 1 + (input_hash[0] % 5) as usize;
    for i in 0..num_completions {
        let completion_seed = (i as u32).wrapping_mul(model_hash[i % 32] as u32);
        hasher.update(&completion_seed.to_le_bytes());
        hasher.update(&input_hash[i % 32..((i + 8) % 32).min(32)]);
    }

    hasher.finalize().to_vec()
}

fn simulate_generic_computation(model_hash: [u8; 32], input_hash: [u8; 32]) -> Vec<u8> {
    let mut hasher = Keccak256::new();
    hasher.update(b"generic:");
    hasher.update(model_hash);
    hasher.update(input_hash);
    hasher.finalize().to_vec()
}

/// @notice The main execution loop for the Executor role.
/// @param client A configured Ethers client for blockchain interaction.
/// @param contract_address The address of the deployed `AethelCore` contract.
pub async fn run(client: Arc<EthClient>, contract_address: Address) -> Result<()> {
    let contract = AethelCore::new(contract_address, client.clone());
    info!("Executor started. Verifying stake requirements...");

    let my_address = client.address();
    let current_stake = contract.executor_stakes(my_address).await?;
    let min_stake = contract.min_executor_stake().await?;

    if current_stake < min_stake {
        warn!("Current stake ({}) is less than minimum required ({})", format_units(current_stake, "ether")?, format_units(min_stake, "ether")?);
        warn!("Please run the 'stake' command to participate as an executor.");
        return Ok(());
    }
    info!("Stake verified. Current stake: {}. Listening for TaskSubmitted events...", format_units(current_stake, "ether")?);

    // Main event loop
    loop {
        let filter = contract.task_submitted_filter().from_block(0);
        let mut stream = match filter.stream().await {
            Ok(s) => s,
            Err(e) => {
                error!("Failed to create event stream: {}. Retrying in 10s...", e);
                sleep(Duration::from_secs(10)).await;
                continue;
            }
        };

        // Process events as they arrive.
        while let Some(log) = stream.next().await {
            if let Ok(event) = log {
                info!("[Task {}] Received new task submission: {:?}", event.task_id, event);
                
                // 1. Perform the AI computation off-chain with enhanced simulation.
                let (computation_result, quality_score) = match execute_ai_model(
                    event.task_id,
                    event.model_hash,
                    event.input_hash,
                    &contract
                ).await {
                    Ok((result, quality)) => (result, quality),
                    Err(e) => {
                        error!("[Task {}] Failed to execute AI model: {}", event.task_id, e);
                        continue;
                    }
                };

                // 2. Hash the result to get the `result_hash`.
                let mut hasher = Keccak256::new();
                hasher.update(&computation_result);
                let result_hash: [u8; 32] = hasher.finalize().into();

                info!("[Task {}] Completed execution. Result hash: 0x{}, Quality: {}",
                      event.task_id, hex::encode(result_hash), quality_score);

                // 3. Submit the result hash to the smart contract.
                let tx = contract.execute_task(event.task_id, result_hash.into());
                match tx.send().await {
                    Ok(pending_tx) => {
                        if let Some(receipt) = pending_tx.await? {
                            info!("[Task {}] Submitted result successfully. Tx: {:?}", event.task_id, receipt.transaction_hash);
                        } else {
                            error!("[Task {}] Transaction for was dropped.", event.task_id);
                        }
                    }
                    Err(e) => {
                        error!("[Task {}] Failed to send execute_task transaction: {}", event.task_id, e);
                    }
                };
            }
        }
        warn!("Event stream disconnected. Reconnecting in 5 seconds...");
        sleep(Duration::from_secs(5)).await;
    }
}
