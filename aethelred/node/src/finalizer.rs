//! finalizer.rs
//!
//! @author Aethelred Team
//! @notice This is the main logic for an Aethelred node running in the "Finalizer" role.
//! Finalizers listen for `TaskExecuted` events and are responsible for calling the `finalize_task`
//! function on the smart contract after the challenge period has safely passed. This is a
//! public good service for the network, ensuring that honest executors get their bonds returned
//! in a timely manner.

use crate::chain::{AethelCore, EthClient};
use ethers::prelude::*;
use std::sync::Arc;
use eyre::Result;
use tokio::time::{sleep, Duration};
use tracing::{info, error, warn};

/// @notice The main execution loop for the Finalizer role.
/// @param client A configured Ethers client for blockchain interaction.
/// @param contract_address The address of the deployed `AethelCore` contract.
pub async fn run(client: Arc<EthClient>, contract_address: Address) -> Result<()> {
    let contract = AethelCore::new(contract_address, client.clone());
    let challenge_period_seconds = contract.challenge_period_seconds().await?.as_u64();
    // Add a small buffer to ensure the chain has processed the block timestamp
    let challenge_duration = Duration::from_secs(challenge_period_seconds + 30);
    
    info!(
        "Finalizer started. Challenge period: {} seconds. Listening for TaskExecuted events...",
        challenge_period_seconds
    );

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
                info!("[Task {}] Observed executed task. Scheduling for finalization.", event.task_id);
                let contract_clone = contract.clone();
                
                // Spawn a new asynchronous task to handle this specific finalization.
                // This allows the main loop to continue listening for new events immediately.
                tokio::spawn(async move {
                    info!("[Task {}] Waiting for challenge period to end ({}s)...", event.task_id, challenge_duration.as_secs());
                    sleep(challenge_duration).await;
                    
                    info!("[Task {}] Challenge period ended. Attempting to finalize.", event.task_id);
                    
                    // Pre-flight check: Before sending a transaction, check if the task is still
                    // in the `Verifying` state. This saves gas if it has been challenged.
                    match contract_clone.tasks(event.task_id).await {
                        Ok(task_data) => {
                            // Status is the 6th element (index 5) in the returned tuple, represented as u8.
                            // `1` corresponds to the `TaskStatus::Verifying` enum variant.
                            let status = task_data.5;
                            if status != 1 { 
                                info!("[Task {}] Task is no longer in 'Verifying' state (current status: {}). Skipping finalization.", event.task_id, status);
                                return;
                            }
                        },
                        Err(e) => {
                            error!("[Task {}] Failed to check task status before finalizing: {}. Proceeding with transaction anyway.", event.task_id, e);
                        }
                    }

                    // Send the finalization transaction.
                    let tx = contract_clone.finalize_task(event.task_id);
                    match tx.send().await {
                        Ok(pending_tx) => {
                            if let Some(receipt) = pending_tx.await.unwrap_or(None) {
                                info!("[Task {}] Finalization successful. Tx: {:?}", event.task_id, receipt.transaction_hash);
                            } else {
                                warn!("[Task {}] Finalization transaction was dropped.", event.task_id);
                            }
                        }
                        Err(e) => {
                            // This error is expected if the task was challenged during the wait period.
                            if e.to_string().contains("TaskNotInCorrectState") {
                                info!("[Task {}] Could not finalize because it was likely challenged.", event.task_id);
                            } else {
                                error!("[Task {}] Failed to send finalization transaction: {}", event.task_id, e);
                            }
                        }
                    };
                });
            }
        }
        warn!("Event stream disconnected. Reconnecting in 5 seconds...");
        sleep(Duration::from_secs(5)).await;
    }
}
