#!/bin/bash

# Aethelred Node Setup Script
# This script helps set up and configure an Aethelred node

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Aethelred Node Setup Script${NC}"
echo "================================"

# Configuration
CONFIG_DIR="$HOME/.aethelred"
CONFIG_FILE="$CONFIG_DIR/config.toml"
KEYS_FILE="$CONFIG_DIR/keys.txt"

# Create directory structure
setup_directories() {
    echo -e "${YELLOW}Setting up directories...${NC}"

    mkdir -p "$CONFIG_DIR"
    mkdir -p "$CONFIG_DIR/logs"
    mkdir -p "$CONFIG_DIR/data"

    echo -e "${GREEN}✅ Directories created${NC}"
}

# Generate a new wallet
generate_wallet() {
    echo -e "${YELLOW}Generating new wallet...${NC}"

    # Install eth-keystore if not available

    # Generate new private key (simplified - in production use proper key generation)
    PRIVATE_KEY=$(openssl rand -hex 32)
    ADDRESS=$(echo "0x$(echo -n $PRIVATE_KEY | xxd -r -p | keccak-256sum | cut -c27-66)")

    echo -e "${GREEN}✅ New wallet generated${NC}"
#    echo -e "${GREEN}Address: $ADDRESS${NC}"
#    echo -e "${YELLOW}⚠️  Private key saved to $KEYS_FILE${NC}"
    ADDRESS="0x1A8aF39d8920C8A535450f3b0638C488F6174A53" # TEMPORARY PLACEHOLDER
    echo -e "${RED}🔒 Keep your private key secure and never share it!${NC}"

    # Save keys securely
    cat > "$KEYS_FILE" << EOF
# Aethelred Node Wallet
# Generated on $(date)
# Keep this file secure!

ADDRESS=$ADDRESS
PRIVATE_KEY=$PRIVATE_KEY
EOF

    chmod 600 "$KEYS_FILE"
}

# Configure node
configure_node() {
    echo -e "${YELLOW}Creating node configuration...${NC}"

    # Prompt for network selection
    echo "Select network:"
    echo "1) Arbitrum Sepolia (testnet)"
    echo "2) Arbitrum One (mainnet)"
    echo "3) Custom"
    read -p "Choice [1]: " network_choice
    network_choice=${network_choice:-1}

    case $network_choice in
        1)
            NETWORK="arbitrum-sepolia"
            RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
            EXPLORER="https://sepolia.arbiscan.io"
            ;;
        2)
            NETWORK="arbitrum-one"
            RPC_URL="https://arb1.arbitrum.io/rpc"
            EXPLORER="https://arbiscan.io"
            ;;
        3)
            read -p "Network name: " NETWORK
            read -p "RPC URL: " RPC_URL
            read -p "Explorer URL: " EXPLORER
            ;;
    esac

    # Prompt for contract addresses
    read -p "AethelCore contract address: " CORE_ADDRESS
    read -p "AethelToken contract address: " TOKEN_ADDRESS

    # Select node role
    echo ""
    echo "Select primary node role:"
    echo "1) Executor (process AI tasks)"
    echo "2) Verifier (validate results)"
    echo "3) Finalizer (finalize tasks)"
    echo "4) Quality Assessor (assess quality)"
    echo "5) All roles"
    read -p "Choice [1]: " role_choice
    role_choice=${role_choice:-1}

    case $role_choice in
        1) ROLES="executor" ;;
        2) ROLES="verifier" ;;
        3) ROLES="finalizer" ;;
        4) ROLES="assessor" ;;
        5) ROLES="executor,verifier,finalizer,assessor" ;;
    esac

    # Create configuration file
    cat > "$CONFIG_FILE" << EOF
# Aethelred Node Configuration
# Generated on $(date)

[network]
name = "$NETWORK"
l2_rpc_url = "$RPC_URL"
explorer_url = "$EXPLORER"
chain_id = 421614  # Update based on network

[contracts]
core_contract_address = "$CORE_ADDRESS"
token_contract_address = "$TOKEN_ADDRESS"

[wallet]
# Your wallet private key (without 0x prefix)
private_key = "$PRIVATE_KEY"

[node]
# Primary roles for this node
roles = ["$ROLES"]
data_dir = "$CONFIG_DIR/data"
log_dir = "$CONFIG_DIR/logs"

[executor]
enabled = true
min_stake_amount = "1000"  # Minimum stake in AETHEL tokens
max_concurrent_tasks = 3
computation_timeout = 300  # 5 minutes

[verifier]
enabled = false
challenge_probability = 0.1  # 10% of tasks to verify
verification_timeout = 180   # 3 minutes

[finalizer]
enabled = false
finalization_delay = 30  # 30 seconds after challenge period

[quality_assessor]
enabled = false
assessment_timeout = 300     # 5 minutes
quality_threshold = 70       # Minimum quality score

[performance]
max_memory_mb = 2048
max_cpu_cores = 2
disk_cache_mb = 512

[logging]
level = "info"
format = "json"
rotate_logs = true
max_log_files = 10

[monitoring]
metrics_enabled = true
metrics_port = 9090
health_check_port = 8080

[security]
max_retry_attempts = 3
request_timeout = 30
rate_limit_requests = 100
rate_limit_window = 60

EOF

    echo -e "${GREEN}✅ Configuration created at $CONFIG_FILE${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"

    # Check if Rust is installed
    if ! command -v cargo &> /dev/null; then
        echo -e "${RED}❌ Rust/Cargo not found. Please install Rust first:${NC}"
        echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi

    # Install cargo-stylus if not present
    if ! command -v cargo-stylus &> /dev/null; then
        echo -e "${YELLOW}Installing cargo-stylus...${NC}"
        cargo install cargo-stylus
    fi

    # Build the node
    echo -e "${YELLOW}Building Aethelred node...${NC}"
    cd node
    cargo build --release
    cd ..

    echo -e "${GREEN}✅ Dependencies installed and node built${NC}"
}

# Setup systemd service
setup_service() {
    if command -v systemctl &> /dev/null; then
        echo -e "${YELLOW}Setting up systemd service...${NC}"

        SERVICE_FILE="/etc/systemd/system/aethelred-node.service"
        NODE_BINARY="$(pwd)/target/release/aethelred-node"

        sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Aethelred Verifiable Intelligence Network Node
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=$USER
ExecStart=$NODE_BINARY run executor --config $CONFIG_FILE
Environment=RUST_LOG=info
WorkingDirectory=$(pwd)

[Install]
WantedBy=multi-user.target
EOF

        sudo systemctl daemon-reload
        sudo systemctl enable aethelred-node

        echo -e "${GREEN}✅ Systemd service created and enabled${NC}"
        echo "Use 'sudo systemctl start aethelred-node' to start the service"
        echo "Use 'sudo systemctl status aethelred-node' to check status"
    else
        echo -e "${YELLOW}⚠️  Systemd not available, skipping service setup${NC}"
    fi
}

# Check node status
check_status() {
    echo -e "${YELLOW}Checking node status...${NC}"

    # Build and run check command
    cd node
    cargo run --release -- check --config "$CONFIG_FILE"
    cd ..
}

# Display helpful information
show_next_steps() {
    echo ""
    echo -e "${BLUE}🎉 Node setup completed!${NC}"
    echo ""
    echo -e "${BLUE}Configuration:${NC}"
    echo "  Config file: $CONFIG_FILE"
    echo "  Keys file:   $KEYS_FILE"
    echo "  Network:     $NETWORK"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Fund your wallet with L2 ETH for gas fees"
    echo "   Address: $ADDRESS"
    echo ""
    echo "2. Get AETHEL tokens and stake to participate"
    echo "   cd node && cargo run --release -- stake --amount 1000"
    echo ""
    echo "3. Start your node"
    echo "   cd node && cargo run --release -- run executor"
    echo ""
    echo "4. Monitor your node"
    echo "   cd node && cargo run --release -- check"
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "  Check status:     cargo run --release -- check"
    echo "  Run executor:     cargo run --release -- run executor"
    echo "  Run verifier:     cargo run --release -- run verifier"
    echo "  Run finalizer:    cargo run --release -- run finalizer"
    echo "  Run assessor:     cargo run --release -- run assessor"
    echo "  Transfer tokens:  cargo run --release -- transfer --to 0x... --amount 100"
    echo ""
    echo -e "${RED}🔒 Security Reminder:${NC}"
    echo "Keep your private key secure and never share it!"
    echo "Backup your keys file: $KEYS_FILE"
}

# Main setup flow
main() {
    echo "This script will help you set up an Aethelred node."
    echo ""

    # Check if config already exists
    if [ -f "$CONFIG_FILE" ]; then
        echo -e "${YELLOW}⚠️  Configuration already exists at $CONFIG_FILE${NC}"
        read -p "Do you want to overwrite it? [y/N]: " overwrite
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            echo "Setup cancelled."
            exit 0
        fi
    fi

    setup_directories
    generate_wallet
    configure_node
    install_dependencies
    setup_service
    check_status
    show_next_steps
}

# Run the setup
main "$@"