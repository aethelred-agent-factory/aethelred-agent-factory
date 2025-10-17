//! main.rs
//!
//! @author Aethelred Team
//! @notice This is the entrypoint for the Aethelred off-chain node application.
//! It uses the `clap` crate to define a command-line interface (CLI) for running the node
//! in different roles (Executor, Verifier, Finalizer) and for managing staking.

mod config;
mod chain;
mod executor;
mod verifier;
mod finalizer;
mod assessor;

use clap::{Parser, Subcommand};
use eyre::Result;
use tracing::{info, warn};
use std::path::PathBuf;
use ethers::{prelude::*, utils::{format_ether, parse_ether}};
use std::sync::Arc;
use crate::chain::{AethelCore, AethelToken, EthClient};

/// The main CLI structure for the Aethelred node.
#[derive(Parser)]
#[command(author, version, about = "Aethelred Verifiable Intelligence Network Node", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

/// Defines the available subcommands for the CLI.
#[derive(Subcommand)]
enum Commands {
    /// Run the Aethelred node in a specific operational role.
    Run {
        #[clap(subcommand)]
        role: Role,
        /// Path to the configuration file.
        #[clap(short, long, default_value = "~/.aethelred/config.toml")]
        config: PathBuf,
    },
    /// Check the node's configuration and on-chain status.
    Check {
        /// Path to the configuration file.
        #[clap(short, long, default_value = "~/.aethelred/config.toml")]
        config: PathBuf,
    },
    /// Stake AETHEL tokens to become an executor.
    Stake {
        /// The amount of AETHEL to stake (e.g., "1000").
        #[clap(short, long)]
        amount: String,
        /// Path to the configuration file.
        #[clap(short, long, default_value = "~/.aethelred/config.toml")]
        config: PathBuf,
    },
    /// Unstake all AETHEL tokens. This will fail if the node has any active, unresolved tasks.
    Unstake {
        /// Path to the configuration file.
        #[clap(short, long, default_value = "~/.aethelred/config.toml")]
        config: PathBuf,
    },
    /// Transfer AETHEL tokens to another address.
    Transfer {
        /// The recipient's address.
        #[clap(short, long)]
        to: Address,
        /// The amount of AETHEL to send (e.g., "500").
        #[clap(short, long)]
        amount: String,
        /// Path to the configuration file.
        #[clap(short, long, default_value = "~/.aethelred/config.toml")]
        config: PathBuf,
    },
    /// Register an AI model in the marketplace.
    RegisterModel {
        /// The model hash (e.g., IPFS CID as hex).
        #[clap(short, long)]
        model_hash: String,
        /// The model URI (e.g., IPFS URI or HTTP URL).
        #[clap(short, long)]
        uri: String,
        /// Usage fee in AETHEL tokens.
        #[clap(short, long)]
        fee: String,
        /// Path to the configuration file.
        #[clap(short, long, default_value = "~/.aethelred/config.toml")]
        config: PathBuf,
    },
    /// Stake tokens on a registered AI model.
    StakeModel {
        /// The model hash to stake on.
        #[clap(short, long)]
        model_hash: String,
        /// The amount of AETHEL to stake.
        #[clap(short, long)]
        amount: String,
        /// Path to the configuration file.
        #[clap(short, long, default_value = "~/.aethelred/config.toml")]
        config: PathBuf,
    },
}

/// Defines the different roles a node can operate in.
#[derive(Subcommand)]
enum Role {
    /// Run as an Executor, processing tasks from the queue.
    Executor,
    /// Run as a Verifier, checking submitted results for correctness and challenging fraud.
    Verifier,
    /// Run as a Finalizer, clearing tasks from the queue after the challenge period.
    Finalizer,
    /// Run as a Quality Assessor, providing quality scores for completed tasks.
    Assessor,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();

    match cli.command {
        Commands::Run { role, config } => {
            let (client, contract_addr) = setup_from_config(config).await?;
            info!("Node wallet address: {:?}", client.address());
            info!("Core contract address: {:?}", contract_addr);

            match role {
                Role::Executor => executor::run(client, contract_addr).await?,
                Role::Verifier => verifier::run(client, contract_addr).await?,
                Role::Finalizer => finalizer::run(client, contract_addr).await?,
                Role::Assessor => assessor::run(client, contract_addr).await?,
            }
        },
        Commands::Check { config } => {
            let (client, contract_addr) = setup_from_config(config).await?;
            let core_contract = AethelCore::new(contract_addr, client.clone());

            let address = client.address();
            let balance = client.get_balance(address, None).await?;
            let token_addr = core_contract.token_address().await?;
            let token_contract = AethelToken::new(token_addr, client.clone());
            let token_balance = token_contract.balance_of(address).await?;
            let stake = core_contract.executor_stakes(address).await?;
            let min_stake = core_contract.min_executor_stake().await?;
            
            println!("\n--- Aethelred Node Status Check ---");
            println!("Node Address:      {:?}", address);
            println!("Native L2 Balance: {} ETH", format_ether(balance));
            println!("AETHEL Balance:    {} AETHEL", format_ether(token_balance));
            println!("-----------------------------------");
            println!("Core Contract:     {:?}", contract_addr);
            println!("Current Stake:     {} AETHEL", format_ether(stake));
            println!("Minimum Stake:     {} AETHEL", format_ether(min_stake));
            println!("-----------------------------------");

            if stake < min_stake {
                warn!("Your current stake is below the minimum required to be an Executor.");
            } else {
                info!("Your stake is sufficient to be an Executor.");
            }
        },
        Commands::Stake { amount, config } => {
            let (client, contract_addr) = setup_from_config(config).await?;
            let core_contract = AethelCore::new(contract_addr, client.clone());
            let token_addr = core_contract.token_address().await?;
            let token_contract = AethelToken::new(token_addr, client.clone());

            let amount_wei = parse_ether(&amount)?;
            info!("Attempting to stake {} AETHEL...", format_ether(amount_wei));

            info!("1. Approving token transfer to the core contract...");
            let approve_tx = token_contract.approve(contract_addr, amount_wei);
            let pending_tx = approve_tx.send().await?.await?;
            info!("Approval successful. Tx: {:?}", pending_tx.unwrap().transaction_hash);

            info!("2. Sending stake transaction...");
            let stake_tx = core_contract.stake(amount_wei);
            let pending_tx = stake_tx.send().await?.await?;
            info!("Stake successful! Tx: {:?}", pending_tx.unwrap().transaction_hash);
        },
        Commands::Unstake { config } => {
            let (client, contract_addr) = setup_from_config(config).await?;
            let core_contract = AethelCore::new(contract_addr, client.clone());
            info!("Attempting to unstake all tokens...");
            let unstake_tx = core_contract.unstake();
            let pending_tx = unstake_tx.send().await?.await?;
            info!("Unstake successful! Tx: {:?}", pending_tx.unwrap().transaction_hash);
        },
        Commands::Transfer { to, amount, config } => {
            let (client, contract_addr) = setup_from_config(config).await?;
            let core_contract = AethelCore::new(contract_addr, client.clone());
            let token_addr = core_contract.token_address().await?;
            let token_contract = AethelToken::new(token_addr, client.clone());

            let amount_wei = parse_ether(&amount)?;
            info!("Attempting to transfer {} AETHEL to {:?}...", format_ether(amount_wei), to);

            let tx = token_contract.transfer(to, amount_wei);
            let pending_tx = tx.send().await?.await?;
            info!("Transfer successful! Tx: {:?}", pending_tx.unwrap().transaction_hash);
        },
        Commands::RegisterModel { model_hash, uri, fee, config } => {
            let (client, contract_addr) = setup_from_config(config).await?;
            let core_contract = AethelCore::new(contract_addr, client.clone());

            // Parse model hash (assuming it's a hex string without 0x prefix)
            let hash_bytes = hex::decode(&model_hash).map_err(|_| eyre::eyre!("Invalid model hash format"))?;
            if hash_bytes.len() != 32 {
                return Err(eyre::eyre!("Model hash must be exactly 32 bytes"));
            }
            let model_hash_b256: [u8; 32] = hash_bytes.try_into().unwrap();

            let fee_wei = parse_ether(&fee)?;
            info!("Registering model {} with URI '{}' and fee {} AETHEL...",
                  hex::encode(model_hash_b256), uri, format_ether(fee_wei));

            let tx = core_contract.register_model(model_hash_b256.into(), uri, fee_wei);
            let pending_tx = tx.send().await?.await?;
            info!("Model registration successful! Tx: {:?}", pending_tx.unwrap().transaction_hash);
        },
        Commands::StakeModel { model_hash, amount, config } => {
            let (client, contract_addr) = setup_from_config(config).await?;
            let core_contract = AethelCore::new(contract_addr, client.clone());
            let token_addr = core_contract.token_address().await?;
            let token_contract = AethelToken::new(token_addr, client.clone());

            // Parse model hash
            let hash_bytes = hex::decode(&model_hash).map_err(|_| eyre::eyre!("Invalid model hash format"))?;
            if hash_bytes.len() != 32 {
                return Err(eyre::eyre!("Model hash must be exactly 32 bytes"));
            }
            let model_hash_b256: [u8; 32] = hash_bytes.try_into().unwrap();

            let amount_wei = parse_ether(&amount)?;
            info!("Staking {} AETHEL on model {}...",
                  format_ether(amount_wei), hex::encode(model_hash_b256));

            info!("1. Approving token transfer...");
            let approve_tx = token_contract.approve(contract_addr, amount_wei);
            let pending_tx = approve_tx.send().await?.await?;
            info!("Approval successful. Tx: {:?}", pending_tx.unwrap().transaction_hash);

            info!("2. Staking on model...");
            let stake_tx = core_contract.stake_model(model_hash_b256.into(), amount_wei);
            let pending_tx = stake_tx.send().await?.await?;
            info!("Model stake successful! Tx: {:?}", pending_tx.unwrap().transaction_hash);
        }
    }
    Ok(())
}

/// @notice Helper function to load configuration and set up the Ethers client.
/// @param config_path The path to the node's configuration file.
/// @return A tuple containing the configured Ethers client and the core contract's address.
async fn setup_from_config(config_path: PathBuf) -> Result<(Arc<EthClient>, Address)> {
    let path_str = shellexpand::tilde(&config_path.to_string_lossy()).to_string();
    info!("Loading configuration from: {}", path_str);
    let cfg = config::Config::from_file(path_str)?;
    let client = chain::setup_client(&cfg).await?;
    let contract_addr: Address = cfg.core_contract_address.parse()?;
    Ok((client, contract_addr))
}
