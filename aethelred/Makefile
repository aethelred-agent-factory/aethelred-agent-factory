# Aethelred Protocol Makefile
# Provides convenient commands for development and deployment

.PHONY: help build test deploy clean docker setup-dev

# Default target
help:
	@echo "🚀 Aethelred Protocol Build System"
	@echo "=================================="
	@echo ""
	@echo "Available commands:"
	@echo "  build          - Build all contracts and node"
	@echo "  test           - Run all tests"
	@echo "  deploy         - Deploy contracts to testnet"
	@echo "  deploy-local   - Deploy to local Anvil node"
	@echo "  clean          - Clean build artifacts"
	@echo "  docker         - Build and run Docker environment"
	@echo "  setup-dev      - Set up development environment"
	@echo "  setup-node     - Set up a new node"
	@echo "  populate       - Populate marketplace with HF models"
	@echo "  check          - Check node status"
	@echo "  format         - Format code"
	@echo "  lint           - Run linting"
	@echo "  docs           - Generate documentation"

# Build all components
build:
	@echo "🔨 Building Aethelred Protocol..."
	@echo "Building contracts..."
	cd contracts/aethel_core && cargo +nightly build --release
	cd contracts/aethel_token && cargo +nightly build --release
	@echo "Building node..."
	cd node && cargo +nightly build --release
	@echo "✅ Build complete!"

# Run tests
test:
	@echo "🧪 Running tests..."
	@echo "Testing contracts..."
	cd contracts/aethel_core && cargo test
	cd contracts/aethel_token && cargo test
	@echo "Testing node..."
	cd node && cargo test
	@echo "✅ Tests complete!"

# Deploy to testnet
deploy:
	@echo "🚀 Deploying to testnet..."
	@if [ -z "$$PRIVATE_KEY" ]; then \
		echo "❌ PRIVATE_KEY environment variable is required"; \
		exit 1; \
	fi
	./scripts/deploy.sh
	@echo "✅ Deployment complete!"

# Deploy to local development environment
deploy-local:
	@echo "🏠 Deploying to local environment..."
	@echo "Starting Anvil..."
	docker-compose up -d anvil
	@sleep 5
	NETWORK=local \
	RPC_URL=http://localhost:8545 \
	PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
	./scripts/deploy.sh
	@echo "✅ Local deployment complete!"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	cd contracts/aethel_core && cargo clean
	cd contracts/aethel_token && cargo clean
	cd node && cargo clean
	docker-compose down -v 2>/dev/null || true
	@echo "✅ Clean complete!"

# Docker development environment
docker:
	@echo "🐳 Starting Docker development environment..."
	docker-compose up -d
	@echo "✅ Docker environment running!"
	@echo ""
	@echo "Services:"
	@echo "  Anvil (Ethereum):  http://localhost:8545"
	@echo "  Grafana:          http://localhost:3000 (admin/aethelred_admin)"
	@echo "  Prometheus:       http://localhost:9090"
	@echo "  IPFS Gateway:     http://localhost:8080"
	@echo "  PostgreSQL:       localhost:5432 (aethelred/aethelred_dev_password)"

# Set up development environment
setup-dev:
	@echo "🛠️  Setting up development environment..."
	@echo "Installing dependencies..."
	@if ! command -v cargo >/dev/null 2>&1; then \
		echo "❌ Rust/Cargo not found. Please install Rust first:"; \
		echo "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"; \
		exit 1; \
	fi
	@if ! command -v docker >/dev/null 2>&1; then \
		echo "❌ Docker not found. Please install Docker first."; \
		exit 1; \
	fi
	@if ! command -v docker-compose >/dev/null 2>&1; then \
		echo "❌ Docker Compose not found. Please install Docker Compose first."; \
		exit 1; \
	fi
	cargo install cargo-stylus
	@echo "✅ Development environment ready!"

# Set up a new node
setup-node:
	@echo "🔧 Setting up new node..."
	./scripts/setup-node.sh

# Populate marketplace
populate:
	@echo "🤗 Populating marketplace with Hugging Face models..."
	./scripts/populate-marketplace.sh

# Check node status
check:
	@echo "📊 Checking node status..."
	cd node && cargo run --release -- check

# Format code
format:
	@echo "🎨 Formatting code..."
	cd contracts/aethel_core && cargo fmt
	cd contracts/aethel_token && cargo fmt
	cd node && cargo fmt
	@echo "✅ Code formatted!"

# Run linting
lint:
	@echo "🔍 Running linting..."
	cd contracts/aethel_core && cargo clippy -- -D warnings
	cd contracts/aethel_token && cargo clippy -- -D warnings
	cd node && cargo clippy -- -D warnings
	@echo "✅ Linting complete!"

# Generate documentation
docs:
	@echo "📚 Generating documentation..."
	cd contracts/aethel_core && cargo doc --no-deps
	cd contracts/aethel_token && cargo doc --no-deps
	cd node && cargo doc --no-deps
	@echo "✅ Documentation generated!"
	@echo "View at: file://$(PWD)/target/doc/aethel_core/index.html"

# Run node in different roles
run-executor:
	@echo "🏃 Running Executor node..."
	cd node && cargo run --release -- run executor

run-verifier:
	@echo "🔍 Running Verifier node..."
	cd node && cargo run --release -- run verifier

run-finalizer:
	@echo "🏁 Running Finalizer node..."
	cd node && cargo run --release -- run finalizer

run-assessor:
	@echo "⭐ Running Quality Assessor node..."
	cd node && cargo run --release -- run assessor

# Stake tokens
stake:
	@if [ -z "$$AMOUNT" ]; then \
		echo "❌ AMOUNT environment variable is required"; \
		echo "Usage: make stake AMOUNT=1000"; \
		exit 1; \
	fi
	@echo "💰 Staking $$AMOUNT AETHEL tokens..."
	cd node && cargo run --release -- stake --amount $$AMOUNT

# Development workflow shortcuts
dev-start: docker deploy-local populate
	@echo "🎉 Development environment fully set up!"

dev-stop:
	@echo "🛑 Stopping development environment..."
	docker-compose down

dev-restart: dev-stop dev-start

# CI/CD helpers
ci-test: format lint test
	@echo "✅ CI tests passed!"

ci-build: build
	@echo "✅ CI build passed!"

# Show logs
logs:
	@echo "📋 Showing Docker logs..."
	docker-compose logs -f

# Monitor nodes
monitor:
	@echo "📊 Opening monitoring dashboard..."
	@echo "Grafana: http://localhost:3000"
	@if command -v open >/dev/null 2>&1; then \
		open http://localhost:3000; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		xdg-open http://localhost:3000; \
	fi