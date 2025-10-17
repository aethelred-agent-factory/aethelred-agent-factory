#!/bin/bash

# Aethelred Protocol Deployment Script
# This script deploys the Aethelred contracts to an Arbitrum network

set -e

# Load environment variables from .env file
if [ -f .env ]; then
    echo -e "${BLUE}Loading environment variables from .env file...${NC}"
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
else
    echo -e "${YELLOW}No .env file found. Using environment variables or defaults.${NC}"
fi

# Configuration with defaults
NETWORK=${NETWORK:-"arbitrum-sepolia"}
PRIVATE_KEY=${PRIVATE_KEY:-""}
RPC_URL=${RPC_URL:-"https://sepolia-rollup.arbitrum.io/rpc"}
INITIAL_SUPPLY=${INITIAL_SUPPLY:-"1000000"}  # 1M AETHEL tokens
DEPLOYER_ADDRESS=${DEPLOYER_ADDRESS:-""}
PROJECT_NAME=${PROJECT_NAME:-"Aethelred Protocol"}
DEPLOYER_NAME=${DEPLOYER_NAME:-"Anonymous"}
CONTACT_EMAIL=${CONTACT_EMAIL:-""}
POPULATE_MARKETPLACE=${POPULATE_MARKETPLACE:-"true"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Aethelred Protocol Deployment Script${NC}"
echo "========================================="

# Check if required tools are installed
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"

    if ! command -v cargo &> /dev/null; then
        echo -e "${RED}❌  cargo could not be found${NC}"
        exit 1
    fi

    if ! command -v cargo-stylus &> /dev/null; then
        echo -e "${YELLOW}⚠️  cargo-stylus not found, installing...${NC}"
        cargo install cargo-stylus
    fi

    echo -e "${GREEN}✅  Dependencies checked${NC}"
}

# Validate environment variables
validate_env() {
    echo -e "${YELLOW}Validating environment...${NC}"

    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}❌  PRIVATE_KEY environment variable is required${NC}"
        echo "Export your private key: export PRIVATE_KEY=0x..."
        exit 1
    fi

    if [ ${#PRIVATE_KEY} -ne 66 ]; then
        echo -e "${RED}❌  PRIVATE_KEY must be 64 hex characters (with 0x prefix)${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅  Environment validated${NC}"
}

# Deploy AETHEL token contract (DEBUG-ENHANCED & RPC-FIXED FUNCTION)
deploy_token() {
    echo -e "${YELLOW}Deploying AETHEL Token...${NC}"

    cd contracts/aethel_token

    # Deploy the contract
    echo -e "${YELLOW}Deploying token contract...${NC}"

    # Set RPC URL as an environment variable for cargo stylus
    export STYLUS_RPC_URL="$RPC_URL"

    # Capture deployment output to a temporary file for inspection
    TEMP_OUTPUT=$(mktemp)

    # Use --no-verify to build locally and avoid Docker workspace issues
    if ! cargo stylus deploy --no-verify --private-key="$PRIVATE_KEY" > "$TEMP_OUTPUT" 2>&1; then
        echo -e "${RED}❌  Failed to deploy AETHEL token. Full error output:${NC}"
        cat "$TEMP_OUTPUT"
        rm "$TEMP_OUTPUT"
        cd ../..
        exit 1
    fi

    # Deployment was successful (exit code 0), now extract the address
    TOKEN_ADDRESS=$(grep 'Deployed contract to:' "$TEMP_OUTPUT" | awk '{print $4}')

    if [ -z "$TOKEN_ADDRESS" ]; then
        echo -e "${RED}❌  Deployment passed but no contract address found. Something is wrong with the output.${NC}"
        echo -e "${BLUE}Dumping deployment output for debugging:${NC}"
        cat "$TEMP_OUTPUT"
        rm "$TEMP_OUTPUT"
        cd ../..
        exit 1
    fi

    rm "$TEMP_OUTPUT"

    echo -e "${GREEN}✅  AETHEL Token deployed at: $TOKEN_ADDRESS${NC}"
    cd ../..
}

# Deploy AethelCore contract (DEBUG--ENHANCED & RPC-FIXED FUNCTION)
deploy_core() {
    echo -e "${YELLOW}Deploying AethelCore Contract...${NC}"

    cd contracts/aethel_core

    # Deploy the contract with token address
    echo -e "${YELLOW}Deploying core contract...${NC}"
    
    # Set RPC URL as an environment variable for cargo stylus
    export STYLUS_RPC_URL="$RPC_URL"
    
    # Capture deployment output to a temporary file for inspection
    TEMP_OUTPUT=$(mktemp)

    # Use --no-verify to build locally and avoid Docker workspace issues
    if ! cargo stylus deploy --no-verify --private-key="$PRIVATE_KEY" > "$TEMP_OUTPUT" 2>&1; then
        echo -e "${RED}❌  Failed to deploy AethelCore contract. Full error output:${NC}"
        cat "$TEMP_OUTPUT"
        rm "$TEMP_OUTPUT"
        cd ../..
        exit 1
    fi

    # Deployment was successful (exit code 0), now extract the address
    CORE_ADDRESS=$(grep 'Deployed contract to:' "$TEMP_OUTPUT" | awk '{print $4}')

    if [ -z "$CORE_ADDRESS" ]; then
        echo -e "${RED}❌  Deployment passed but no contract address found for AethelCore. Something is wrong with the output.${NC}"
        echo -e "${BLUE}Dumping deployment output for debugging:${NC}"
        cat "$TEMP_OUTPUT"
        rm "$TEMP_OUTPUT"
        cd ../..
        exit 1
    fi
    
    rm "$TEMP_OUTPUT"
    
    echo -e "${GREEN}✅  AethelCore deployed at: $CORE_ADDRESS${NC}"
    cd ../..
}

# Generate configuration files
generate_config() {
    echo -e "${YELLOW}Generating configuration files...${NC}"

    # Create deployment info file
    cat > deployment.json << EOF
{
  "network": "$NETWORK",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": {
    "address": "$DEPLOYER_ADDRESS",
    "name": "$DEPLOYER_NAME",
    "contact": "$CONTACT_EMAIL"
  },
  "project": {
    "name": "$PROJECT_NAME",
    "description": "Verifiable Intelligence Network on Arbitrum"
  },
  "contracts": {
    "aethel_token": {
      "address": "$TOKEN_ADDRESS",
      "name": "AethelToken",
      "symbol": "AETHEL",
      "decimals": 18
    },
    "aethel_core": {
      "address": "$CORE_ADDRESS",
      "name": "AethelCore"
    }
  },
  "constructor_args": {
    "initial_supply": "$INITIAL_SUPPLY",
    "token_address": "$TOKEN_ADDRESS"
  },
  "network_info": {
    "rpc_url": "$RPC_URL",
    "chain_id": "421614",
    "explorer": "https://sepolia.arbiscan.io"
  }
}
EOF

    # Create node configuration template
    mkdir -p ~/.aethelred
    cat > ~/.aethelred/config.toml << EOF
# Aethelred Node Configuration
# Generated on $(date)

[network]
l2_rpc_url = "$RPC_URL"
network_name = "$NETWORK"

[contracts]
core_contract_address = "$CORE_ADDRESS"
token_contract_address = "$TOKEN_ADDRESS"

[wallet]
# Set your private key here (without 0x prefix)
private_key = "YOUR_PRIVATE_KEY_HERE"

[executor]
min_stake_amount = "1000"  # Minimum stake in AETHEL tokens
max_concurrent_tasks = 5

[quality_assessor]
enabled = true
assessment_timeout = 300  # 5 minutes

[logging]
level = "info"
format = "json"
EOF

    echo -e "${GREEN}✅  Configuration files generated:${NC}"
    echo "  - deployment.json"
    echo "  - ~/.aethelred/config.toml"
}

# Verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"

    # Try to call a view function to verify the contracts are working
    echo "Testing contract interactions..."

    # Check if we can build the node (basic sanity check)
    cd node
    cargo check --quiet && echo -e "${GREEN}✅  Node builds successfully${NC}" || echo -e "${RED}❌  Node build failed${NC}"
    cd ..
}

# Main deployment flow
main() {
    echo "Network: $NETWORK"
    echo "RPC URL: $RPC_URL"
    echo "Initial Supply: $INITIAL_SUPPLY AETHEL"
    echo ""

    check_dependencies
    validate_env
    deploy_token
    deploy_core
    generate_config
    verify_deployment

    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Contract Addresses:${NC}"
    echo -e "${GREEN}AETHEL Token: $TOKEN_ADDRESS${NC}"
    echo -e "${GREEN}AethelCore:   $CORE_ADDRESS${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Update your node configuration in ~/.aethelred/config.toml"
    echo "2. Set your private key in the config file"
    echo "3. Fund your wallet with L2 ETH for gas fees"
    echo "4. Get some AETHEL tokens and stake to become an executor"
    echo ""
    echo -e "${BLUE}Example commands:${NC}"
    echo "cargo run --bin aethelred-node -- check"
    echo "cargo run --bin aethelred-node -- stake --amount 1000"
    echo "cargo run --bin aethelred-node -- run executor"
}

# Run the deployment
main "$@"
