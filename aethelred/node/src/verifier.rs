//! verifier.rs
//!
//! @author Aethelred Team
//! @notice This is the main logic for an Aethelred node running in the "Verifier" role.
//! Verifiers listen for `TaskExecuted` events, re-run the computation off-chain, and if the
//! result hash does not match the one submitted by the Executor, they submit a challenge
//! to the `AethelCore` contract, initiating a dispute.

use crate::chain::{AethelCore, EthClient};
use ethers::prelude::*;
use std::sync::Arc;
use eyre::Result;
use sha3::{Digest, Keccak256};
use tokio::time::{sleep, Duration};
use tracing::{info, error, warn};

/// @notice Represents the verifier's re-execution of an AI model.
/// @dev A real, honest verifier always performs the correct computation to check the executor's work.
fn verify_ai_model_execution(task_id: U256, model_hash: [u8; 32], input_hash: [u8; 32]) -> Result<Vec<u8>> {
    info!(
        "[Task {}] Verifying AI model execution (simulation)...", task_id
    );
    let mut hasher = Keccak256::new();
    
    // The verifier ALWAYS performs the correct computation.
    hasher.update(b"correct_computation_prefix");
    hasher.update(model_hash);
    hasher.update(input_hash);
    let result = hasher.finalize().to_vec();
    Ok(result)
}

/// @notice The main execution loop for the Verifier role.
/// @param client A configured Ethers client for blockchain interaction.
/// @param contract_address The address of the deployed `AethelCore` contract.
pub async fn run(client: Arc<EthClient>, contract_address: Address) -> Result<()> {
    let contract = AethelCore::new(contract_address, client.clone());
    info!("Verifier started. Listening for TaskExecuted events...");

    loop {
        let filter = contract.task_executed_filter().from_block(0);
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
                info!("[Task {}] Observed executed task: {:?}", event.task_id, event);

                // 1. Fetch the original task details to get model and input hashes.
                let task_info = match contract.tasks(event.task_id).await {
                    Ok(info) => info,
                    Err(e) => {
                        error!("[Task {}] Failed to fetch task info: {}. Skipping.", event.task_id, e);
                        continue;
                    }
                };
                let model_hash: [u8; 32] = task_info.2.into();
                let input_hash: [u8; 32] = task_info.3.into();

                // 2. Re-run the computation to verify the result.
                let verifier_computation_result = verify_ai_model_execution(event.task_id, model_hash, input_hash)?;
                let mut hasher = Keccak256::new();
                hasher.update(&verifier_computation_result);
                let verifier_result_hash: [u8; 32] = hasher.finalize().into();

                // 3. Compare the verifier's result hash with the executor's submitted hash.
                let executor_result_hash: [u8; 32] = event.result_hash.into();

                if verifier_result_hash != executor_result_hash {
                    warn!("[Task {}] Incorrect result detected! Submitting challenge.", event.task_id);
                    warn!("  Executor Result: 0x{}", hex::encode(executor_result_hash));
                    warn!("  Our Result:      0x{}", hex::encode(verifier_result_hash));
                    
                    // 4. If they don't match, submit a challenge transaction.
                    let tx = contract.challenge_task(event.task_id, verifier_result_hash.into());
                    match tx.send().await {
                        Ok(pending_tx) => {
                           if let Some(receipt) = pending_tx.await? {
                                info!("[Task {}] Submitted challenge successfully. Tx: {:?}", event.task_id, receipt.transaction_hash);
                           } else {
                                error!("[Task {}] Challenge transaction was dropped.", event.task_id);
                           }
                        }
                        Err(e) => {
                            error!("[Task {}] Failed to send challenge_task transaction: {}", event.task_id, e);
                        }
                    };
                } else {
                    info!("[Task {}] Result appears correct. Not challenging.", event.task_id);
                }
            }
        }
        warn!("Event stream disconnected. Reconnecting in 5 seconds...");
        sleep(Duration::from_secs(5)).await;
    }
}
