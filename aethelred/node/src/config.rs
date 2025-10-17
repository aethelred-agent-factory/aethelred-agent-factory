//! config.rs
//!
//! @author Aethelred Team
//! @notice This module defines the configuration structure for the Aethelred node.
//! It uses the `config` crate to deserialize settings from a TOML file into a strongly-typed
//! Rust struct, making configuration management safe and straightforward.

use serde::Deserialize;
use std::path::Path;

/// @notice Holds all necessary configuration for the node to operate.
#[derive(Debug, Deserialize, Clone)]
pub struct Config {
    /// @notice The HTTP RPC endpoint for the Layer 2 network (e.g., Arbitrum, Optimism).
    pub l2_rpc_url: String,
    /// @notice The private key of the wallet the node will use to sign transactions.
    /// @dev Should start with "0x". IMPORTANT: Do not use a key with mainnet funds for testing.
    pub private_key: String,
    /// @notice The deployed address of the `AethelCore` smart contract on the L2 network.
    pub core_contract_address: String,
}

impl Config {
    /// @notice Loads configuration from a specified file path.
    /// @param path The path to the TOML configuration file.
    /// @return A `Result` containing the populated `Config` struct or a `config::ConfigError`.
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self, config::ConfigError> {
        let builder = config::Config::builder()
           .add_source(config::File::from(path.as_ref()));
        builder.build()?.try_deserialize()
    }
}
