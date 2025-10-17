//! assessor.rs
//!
//! @author Aethelred Team
//! @notice This is the main logic for an Aethelred node running in the "Quality Assessor" role.
//! Quality Assessors listen for `QualityAssessmentStarted` events and provide quality scores
//! for completed tasks to maintain the Proof of Quality (PoQ) system.

use crate::chain::{AethelCore, EthClient};
use ethers::prelude::*;
use std::sync::Arc;
use eyre::Result;
use sha3::{Digest, Keccak256};
use tokio::time::{sleep, Duration};
use tracing::{info, error, warn};

/// @notice Quality assessment criteria and weights
#[derive(Debug, Clone)]
struct QualityMetrics {
    accuracy: f64,
    consistency: f64,
    completeness: f64,
    relevance: f64,
}

impl QualityMetrics {
    fn calculate_overall_score(&self) -> u32 {
        let weighted_score = (self.accuracy * 0.4 +
                             self.consistency * 0.25 +
                             self.completeness * 0.2 +
                             self.relevance * 0.15) * 100.0;
        weighted_score.round() as u32
    }
}

/// @notice Simulate quality assessment for different types of AI outputs
async fn assess_task_quality(
    task_id: U256,
    model_hash: [u8; 32],
    input_hash: [u8; 32],
    result_hash: [u8; 32],
    contract: &AethelCore<EthClient>,
) -> Result<u32> {
    info!("[Task {}] Starting quality assessment for result: 0x{}",
          task_id, hex::encode(result_hash));

    // Get task details
    let _task_data = contract.tasks(task_id).await?;
    let model_type = determine_model_type(model_hash);

    // Simulate quality assessment time
    sleep(Duration::from_millis(500 + (task_id.as_u64() % 1000))).await;

    // Get model reputation if available
    let model_reputation = match contract.models(model_hash.into()).await {
        Ok(model_info) => model_info.5.as_u32(),
        Err(_) => 50, // Default reputation
    };

    // Perform model-specific quality assessment
    let metrics = match model_type.as_str() {
        "text_generation" => assess_text_generation_quality(model_hash, input_hash, result_hash, model_reputation),
        "image_classification" => assess_image_classification_quality(model_hash, input_hash, result_hash, model_reputation),
        "sentiment_analysis" => assess_sentiment_analysis_quality(model_hash, input_hash, result_hash, model_reputation),
        "code_completion" => assess_code_completion_quality(model_hash, input_hash, result_hash, model_reputation),
        _ => assess_generic_quality(model_hash, input_hash, result_hash, model_reputation),
    };

    let quality_score = metrics.calculate_overall_score();

    info!("[Task {}] Quality assessment completed. Score: {} (Accuracy: {:.2}, Consistency: {:.2}, Completeness: {:.2}, Relevance: {:.2})",
          task_id, quality_score, metrics.accuracy, metrics.consistency, metrics.completeness, metrics.relevance);

    Ok(quality_score)
}

fn determine_model_type(model_hash: [u8; 32]) -> String {
    match model_hash[0] % 4 {
        0 => "text_generation".to_string(),
        1 => "image_classification".to_string(),
        2 => "sentiment_analysis".to_string(),
        3 => "code_completion".to_string(),
        _ => "unknown".to_string(),
    }
}

fn assess_text_generation_quality(
    model_hash: [u8; 32],
    input_hash: [u8; 32],
    result_hash: [u8; 32],
    model_reputation: u32,
) -> QualityMetrics {
    let base_seed = combine_hashes(model_hash, input_hash, result_hash);

    // Text generation assessment focuses on coherence, relevance, and fluency
    let coherence = normalize_hash_to_score(base_seed, 0) * 0.9 + (model_reputation as f64 / 1000.0);
    let fluency = normalize_hash_to_score(base_seed, 1) * 0.85 + 0.1;
    let relevance = normalize_hash_to_score(base_seed, 2) * 0.8 + 0.15;
    let completeness = normalize_hash_to_score(base_seed, 3) * 0.9 + 0.05;

    QualityMetrics {
        accuracy: coherence.min(1.0),
        consistency: fluency.min(1.0),
        completeness: completeness.min(1.0),
        relevance: relevance.min(1.0),
    }
}

fn assess_image_classification_quality(
    model_hash: [u8; 32],
    input_hash: [u8; 32],
    result_hash: [u8; 32],
    model_reputation: u32,
) -> QualityMetrics {
    let base_seed = combine_hashes(model_hash, input_hash, result_hash);

    // Image classification assessment focuses on accuracy and confidence
    let accuracy = normalize_hash_to_score(base_seed, 0) * 0.95 + (model_reputation as f64 / 2000.0);
    let confidence = normalize_hash_to_score(base_seed, 1) * 0.9 + 0.05;
    let consistency = normalize_hash_to_score(base_seed, 2) * 0.85 + 0.1;
    let completeness = 0.95; // Classification tasks are typically complete

    QualityMetrics {
        accuracy: accuracy.min(1.0),
        consistency: confidence.min(1.0),
        completeness: completeness,
        relevance: consistency.min(1.0),
    }
}

fn assess_sentiment_analysis_quality(
    model_hash: [u8; 32],
    input_hash: [u8; 32],
    result_hash: [u8; 32],
    model_reputation: u32,
) -> QualityMetrics {
    let base_seed = combine_hashes(model_hash, input_hash, result_hash);

    // Sentiment analysis assessment focuses on accuracy and nuance
    let accuracy = normalize_hash_to_score(base_seed, 0) * 0.9 + (model_reputation as f64 / 1500.0);
    let nuance = normalize_hash_to_score(base_seed, 1) * 0.8 + 0.15;
    let consistency = normalize_hash_to_score(base_seed, 2) * 0.85 + 0.1;
    let completeness = 0.9; // Sentiment tasks are usually straightforward

    QualityMetrics {
        accuracy: accuracy.min(1.0),
        consistency: nuance.min(1.0),
        completeness: completeness,
        relevance: consistency.min(1.0),
    }
}

fn assess_code_completion_quality(
    model_hash: [u8; 32],
    input_hash: [u8; 32],
    result_hash: [u8; 32],
    model_reputation: u32,
) -> QualityMetrics {
    let base_seed = combine_hashes(model_hash, input_hash, result_hash);

    // Code completion assessment focuses on syntax, logic, and usefulness
    let syntax_correctness = normalize_hash_to_score(base_seed, 0) * 0.9 + 0.05;
    let logic_soundness = normalize_hash_to_score(base_seed, 1) * 0.85 + (model_reputation as f64 / 1200.0);
    let usefulness = normalize_hash_to_score(base_seed, 2) * 0.8 + 0.1;
    let completeness = normalize_hash_to_score(base_seed, 3) * 0.7 + 0.2;

    QualityMetrics {
        accuracy: syntax_correctness.min(1.0),
        consistency: logic_soundness.min(1.0),
        completeness: completeness.min(1.0),
        relevance: usefulness.min(1.0),
    }
}

fn assess_generic_quality(
    model_hash: [u8; 32],
    input_hash: [u8; 32],
    result_hash: [u8; 32],
    model_reputation: u32,
) -> QualityMetrics {
    let base_seed = combine_hashes(model_hash, input_hash, result_hash);

    // Generic assessment with conservative scoring
    let base_quality = 0.75 + (model_reputation as f64 / 2000.0);
    let variance = 0.1;

    QualityMetrics {
        accuracy: (base_quality + normalize_hash_to_score(base_seed, 0) * variance).min(1.0),
        consistency: (base_quality + normalize_hash_to_score(base_seed, 1) * variance).min(1.0),
        completeness: (base_quality + normalize_hash_to_score(base_seed, 2) * variance).min(1.0),
        relevance: (base_quality + normalize_hash_to_score(base_seed, 3) * variance).min(1.0),
    }
}

fn combine_hashes(hash1: [u8; 32], hash2: [u8; 32], hash3: [u8; 32]) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(hash1);
    hasher.update(hash2);
    hasher.update(hash3);
    hasher.finalize().into()
}

fn normalize_hash_to_score(hash: [u8; 32], offset: usize) -> f64 {
    let byte_index = offset % 32;
    hash[byte_index] as f64 / 255.0
}

/// @notice The main execution loop for the Quality Assessor role.
/// @param client A configured Ethers client for blockchain interaction.
/// @param contract_address The address of the deployed `AethelCore` contract.
pub async fn run(client: Arc<EthClient>, contract_address: Address) -> Result<()> {
    let contract = AethelCore::new(contract_address, client.clone());
    let my_address = client.address();

    info!("Quality Assessor started. Address: {:?}. Listening for QualityAssessmentStarted events...", my_address);

    loop {
        let filter = contract.quality_assessment_started_filter().from_block(0);
        let mut stream = match filter.stream().await {
            Ok(s) => s,
            Err(e) => {
                error!("Failed to create event stream: {}. Retrying in 10s...", e);
                sleep(Duration::from_secs(10)).await;
                continue;
            }
        };

        while let Some(log) = stream.next().await {
            if let Ok(event) = log {
                // Check if we are one of the selected assessors
                if !event.assessors.contains(&my_address) {
                    info!("[Task {}] Not selected as assessor for this task", event.task_id);
                    continue;
                }

                info!("[Task {}] Selected as quality assessor! Processing assessment...", event.task_id);

                // Get task details to perform assessment
                match contract.tasks(event.task_id).await {
                    Ok(task_data) => {
                        let task_id = task_data.0;
                        let model_hash: [u8; 32] = task_data.2.into();
                        let input_hash: [u8; 32] = task_data.3.into();
                        let result_hash: [u8; 32] = task_data.4.into();

                        // Perform quality assessment
                        match assess_task_quality(
                            task_id,
                            model_hash,
                            input_hash,
                            result_hash,
                            &contract
                        ).await {
                            Ok(quality_score) => {
                                // Submit quality score to contract
                                let tx = contract.submit_quality_score(task_id, quality_score.into());
                                let pending_tx = match tx.send().await {
                                    Ok(p) => p,
                                    Err(e) => {
                                        error!("[Task {}] Failed to submit quality score: {}", task_id, e);
                                        continue;
                                    }
                                };

                                let receipt = match pending_tx.await {
                                    Ok(Some(r)) => r,
                                    Ok(None) => {
                                        warn!("[Task {}] Quality score submission transaction was dropped", task_id);
                                        continue;
                                    }
                                    Err(e) => {
                                        error!("[Task {}] Failed to get receipt: {}", task_id, e);
                                        continue;
                                    }
                                };

                                info!("[Task {}] Quality score ({}) submitted successfully. Tx: {:?}",
                                        task_id, quality_score, receipt.transaction_hash);
                            }
                            Err(e) => {
                                error!("[Task {}] Failed to assess quality: {}", event.task_id, e);
                            }
                        }
                    }
                    Err(e) => {
                        error!("[Task {}] Failed to get task details: {}", event.task_id, e);
                    }
                }
            }
        }

        warn!("Event stream disconnected. Reconnecting in 5 seconds...");
        sleep(Duration::from_secs(5)).await;
    }
}