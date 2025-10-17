# Aethel Agent Factory - Unified Development Environment
.PHONY: help install build test deploy clean dev-start dev-stop monitor lint format

# Default target
help:
	@echo "🤖 Aethel Agent Factory - Unified Commands"
	@echo "=========================================="
	@echo ""
	@echo "Setup Commands:"
	@echo "  install     - Install all dependencies (Rust + Node.js)"
	@echo "  build       - Build all components (Rust + Contracts)"
	@echo "  clean       - Clean all build artifacts"
	@echo ""
	@echo "Development Commands:"
	@echo "  dev-start   - Start full development environment"
	@echo "  dev-stop    - Stop development environment"
	@echo "  dev-reset   - Reset and restart development environment"
	@echo ""
	@echo "Testing Commands:"
	@echo "  test        - Run all tests (Rust + Contracts)"
	@echo "  test-rust   - Run Rust tests only"
	@echo "  test-js     - Run JavaScript/Contract tests only"
	@echo "  integration - Run end-to-end integration tests"
	@echo ""
	@echo "Deployment Commands:"
	@echo "  deploy      - Deploy both Aethelred and Agent Factory"
	@echo "  deploy-rust - Deploy Aethelred protocol only"
	@echo "  deploy-js   - Deploy Agent Factory contracts only"
	@echo ""
	@echo "Monitoring Commands:"
	@echo "  monitor     - Monitor agent status and balances"
	@echo "  logs        - Show real-time logs from all components"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint        - Run linting for all languages"
	@echo "  format      - Format all code"
	@echo ""

# Setup and Installation
install:
	@echo "📦 Installing all dependencies..."
	npm install
	cd aethelred && cargo build
	@echo "✅ All dependencies installed!"

build:
	@echo "🔨 Building all components..."
	cd aethelred && cargo build --release
	cd agent-factory-mvp && npx hardhat compile
	@echo "✅ All components built!"

clean:
	@echo "🧹 Cleaning build artifacts..."
	cd aethelred && cargo clean
	cd agent-factory-mvp && rm -rf artifacts cache
	npm run clean 2>/dev/null || true
	@echo "✅ Cleaned!"

# Development Environment
dev-start:
	@echo "🚀 Starting development environment..."
	@echo "This will start:"
	@echo "  - Local Ethereum node (Hardhat)"
	@echo "  - Aethelred executor node"
	npm run dev:start

dev-stop:
	@echo "🛑 Stopping development environment..."
	pkill -f "hardhat node" || true
	pkill -f "aethelred-node" || true
	@echo "✅ Development environment stopped!"

dev-reset: dev-stop clean build dev-start

# Testing
test:
	@echo "🧪 Running all tests..."
	npm run test

test-rust:
	@echo "🦀 Running Rust tests..."
	cd aethelred && cargo test

test-js:
	@echo "🟨 Running JavaScript tests..."
	cd agent-factory-mvp && npx hardhat test

integration:
	@echo "🔗 Running integration tests..."
	npm run integration:test

# Deployment
deploy:
	@echo "🚀 Deploying full system..."
	npm run deploy

deploy-rust:
	@echo "🦀 Deploying Aethelred protocol..."
	cd aethelred && make deploy-local

deploy-js:
	@echo "🟨 Deploying Agent Factory contracts..."
	cd agent-factory-mvp && npx hardhat run scripts/deploy_and_write.js --network localhost

# Monitoring and Debugging
monitor:
	@echo "📊 Monitoring agent status..."
	npm run monitor

logs:
	@echo "📋 Showing real-time logs..."
	tail -f agent-factory-mvp/logs/*.log aethelred/logs/*.log 2>/dev/null || echo "No log files found"

# Code Quality
lint:
	@echo "🔍 Running linting..."
	cd aethelred && cargo clippy -- -D warnings
	cd agent-factory-mvp && npx eslint . || echo "ESLint not configured"

format:
	@echo "✨ Formatting code..."
	cd aethelred && cargo fmt
	cd agent-factory-mvp && npx prettier --write . || echo "Prettier not configured"

# Utility Commands
setup-env:
	@echo "⚙️ Setting up environment files..."
	@if [ ! -f .env ]; then \
		echo "DEEPSEEK_API_KEY=your_api_key_here" > .env; \
		echo "📝 Created .env file - please add your API keys"; \
	fi
	@if [ ! -f aethelred/config.example.toml ]; then \
		echo "📝 Please configure aethelred/config.example.toml"; \
	fi

quick-start: install build setup-env deploy dev-start
	@echo "🎉 Quick start complete!"
	@echo "📊 Run 'make monitor' to check agent status"
	@echo "🔧 Run 'make help' for more commands"

# Documentation
docs:
	@echo "📚 Generating documentation..."
	cd aethelred && cargo doc --no-deps
	@echo "📖 Rust docs: file://$(PWD)/aethelred/target/doc/aethelred/index.html"

# Security
audit:
	@echo "🔒 Running security audit..."
	cd aethelred && cargo audit || echo "cargo-audit not installed"
	cd agent-factory-mvp && npm audit

# Maintenance
update:
	@echo "⬆️ Updating dependencies..."
	cd aethelred && cargo update
	cd agent-factory-mvp && npm update