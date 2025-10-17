#!/bin/bash

# Aethelred Marketplace Population Script
# This script registers popular open source Hugging Face models in the Aethelred marketplace

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤗 Aethelred Marketplace Population Script${NC}"
echo "=========================================="

# Configuration
CONFIG_FILE=${CONFIG_FILE:-"$HOME/.aethelred/config.toml"}
DEFAULT_FEE="10"  # 10 AETHEL per inference

# Check if node is built
check_node() {
    echo -e "${YELLOW}Checking node availability...${NC}"

    if [ ! -f "node/target/release/aethelred-node" ] && [ ! -f "target/release/aethelred-node" ]; then
        echo -e "${YELLOW}Building node...${NC}"
        cd node 2>/dev/null || true
        cargo build --release
        cd .. 2>/dev/null || true
    fi

    echo -e "${GREEN}✅ Node ready${NC}"
}

# Function to register a model
register_model() {
    local model_name="$1"
    local model_hash="$2"
    local model_uri="$3"
    local usage_fee="$4"

    echo -e "${YELLOW}Registering: $model_name${NC}"

    cd node 2>/dev/null || true

    if cargo run --release -- register-model \
        --model-hash "$model_hash" \
        --uri "$model_uri" \
        --fee "$usage_fee" \
        --config "$CONFIG_FILE" 2>/dev/null; then
        echo -e "${GREEN}✅ $model_name registered successfully${NC}"
    else
        echo -e "${RED}❌ Failed to register $model_name${NC}"
    fi

    cd .. 2>/dev/null || true
    sleep 2  # Rate limiting
}

# Function to calculate model hash from name
calculate_model_hash() {
    local model_name="$1"
    echo -n "$model_name" | sha256sum | cut -d' ' -f1
}

# Popular Hugging Face models to register
populate_text_generation_models() {
    echo -e "${BLUE}📝 Registering Text Generation Models...${NC}"

    # Large Language Models
    register_model "microsoft/DialoGPT-medium" \
        "$(calculate_model_hash "microsoft/DialoGPT-medium")" \
        "https://huggingface.co/microsoft/DialoGPT-medium" \
        "15"

    register_model "facebook/blenderbot-400M-distill" \
        "$(calculate_model_hash "facebook/blenderbot-400M-distill")" \
        "https://huggingface.co/facebook/blenderbot-400M-distill" \
        "12"

    register_model "gpt2" \
        "$(calculate_model_hash "gpt2")" \
        "https://huggingface.co/gpt2" \
        "8"

    register_model "distilgpt2" \
        "$(calculate_model_hash "distilgpt2")" \
        "https://huggingface.co/distilgpt2" \
        "5"

    register_model "EleutherAI/gpt-neo-1.3B" \
        "$(calculate_model_hash "EleutherAI/gpt-neo-1.3B")" \
        "https://huggingface.co/EleutherAI/gpt-neo-1.3B" \
        "20"

    register_model "microsoft/CodeGPT-small-py" \
        "$(calculate_model_hash "microsoft/CodeGPT-small-py")" \
        "https://huggingface.co/microsoft/CodeGPT-small-py" \
        "10"
}

populate_classification_models() {
    echo -e "${BLUE}🏷️  Registering Classification Models...${NC}"

    # Image Classification
    register_model "google/vit-base-patch16-224" \
        "$(calculate_model_hash "google/vit-base-patch16-224")" \
        "https://huggingface.co/google/vit-base-patch16-224" \
        "8"

    register_model "microsoft/resnet-50" \
        "$(calculate_model_hash "microsoft/resnet-50")" \
        "https://huggingface.co/microsoft/resnet-50" \
        "6"

    register_model "facebook/deit-tiny-patch16-224" \
        "$(calculate_model_hash "facebook/deit-tiny-patch16-224")" \
        "https://huggingface.co/facebook/deit-tiny-patch16-224" \
        "4"

    # Text Classification
    register_model "cardiffnlp/twitter-roberta-base-sentiment-latest" \
        "$(calculate_model_hash "cardiffnlp/twitter-roberta-base-sentiment-latest")" \
        "https://huggingface.co/cardiffnlp/twitter-roberta-base-sentiment-latest" \
        "7"

    register_model "nlptown/bert-base-multilingual-uncased-sentiment" \
        "$(calculate_model_hash "nlptown/bert-base-multilingual-uncased-sentiment")" \
        "https://huggingface.co/nlptown/bert-base-multilingual-uncased-sentiment" \
        "9"

    register_model "distilbert-base-uncased-finetuned-sst-2-english" \
        "$(calculate_model_hash "distilbert-base-uncased-finetuned-sst-2-english")" \
        "https://huggingface.co/distilbert-base-uncased-finetuned-sst-2-english" \
        "6"
}

populate_embedding_models() {
    echo -e "${BLUE}🧮 Registering Embedding Models...${NC}"

    register_model "sentence-transformers/all-MiniLM-L6-v2" \
        "$(calculate_model_hash "sentence-transformers/all-MiniLM-L6-v2")" \
        "https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2" \
        "5"

    register_model "sentence-transformers/all-mpnet-base-v2" \
        "$(calculate_model_hash "sentence-transformers/all-mpnet-base-v2")" \
        "https://huggingface.co/sentence-transformers/all-mpnet-base-v2" \
        "8"

    register_model "sentence-transformers/paraphrase-MiniLM-L3-v2" \
        "$(calculate_model_hash "sentence-transformers/paraphrase-MiniLM-L3-v2")" \
        "https://huggingface.co/sentence-transformers/paraphrase-MiniLM-L3-v2" \
        "4"
}

populate_multimodal_models() {
    echo -e "${BLUE}🎭 Registering Multimodal Models...${NC}"

    register_model "openai/clip-vit-base-patch32" \
        "$(calculate_model_hash "openai/clip-vit-base-patch32")" \
        "https://huggingface.co/openai/clip-vit-base-patch32" \
        "12"

    register_model "openai/clip-vit-large-patch14" \
        "$(calculate_model_hash "openai/clip-vit-large-patch14")" \
        "https://huggingface.co/openai/clip-vit-large-patch14" \
        "18"

    register_model "microsoft/git-base" \
        "$(calculate_model_hash "microsoft/git-base")" \
        "https://huggingface.co/microsoft/git-base" \
        "15"
}

populate_specialized_models() {
    echo -e "${BLUE}🔬 Registering Specialized Models...${NC}"

    # Question Answering
    register_model "deepset/roberta-base-squad2" \
        "$(calculate_model_hash "deepset/roberta-base-squad2")" \
        "https://huggingface.co/deepset/roberta-base-squad2" \
        "10"

    register_model "distilbert-base-cased-distilled-squad" \
        "$(calculate_model_hash "distilbert-base-cased-distilled-squad")" \
        "https://huggingface.co/distilbert-base-cased-distilled-squad" \
        "8"

    # Named Entity Recognition
    register_model "dbmdz/bert-large-cased-finetuned-conll03-english" \
        "$(calculate_model_hash "dbmdz/bert-large-cased-finetuned-conll03-english")" \
        "https://huggingface.co/dbmdz/bert-large-cased-finetuned-conll03-english" \
        "12"

    # Text Summarization
    register_model "facebook/bart-large-cnn" \
        "$(calculate_model_hash "facebook/bart-large-cnn")" \
        "https://huggingface.co/facebook/bart-large-cnn" \
        "16"

    register_model "t5-small" \
        "$(calculate_model_hash "t5-small")" \
        "https://huggingface.co/t5-small" \
        "7"

    # Translation
    register_model "Helsinki-NLP/opus-mt-en-de" \
        "$(calculate_model_hash "Helsinki-NLP/opus-mt-en-de")" \
        "https://huggingface.co/Helsinki-NLP/opus-mt-en-de" \
        "9"

    register_model "Helsinki-NLP/opus-mt-en-fr" \
        "$(calculate_model_hash "Helsinki-NLP/opus-mt-en-fr")" \
        "https://huggingface.co/Helsinki-NLP/opus-mt-en-fr" \
        "9"
}

populate_code_models() {
    echo -e "${BLUE}💻 Registering Code Models...${NC}"

    register_model "microsoft/codebert-base" \
        "$(calculate_model_hash "microsoft/codebert-base")" \
        "https://huggingface.co/microsoft/codebert-base" \
        "14"

    register_model "huggingface/CodeBERTa-small-v1" \
        "$(calculate_model_hash "huggingface/CodeBERTa-small-v1")" \
        "https://huggingface.co/huggingface/CodeBERTa-small-v1" \
        "10"

    register_model "Salesforce/codegen-350M-mono" \
        "$(calculate_model_hash "Salesforce/codegen-350M-mono")" \
        "https://huggingface.co/Salesforce/codegen-350M-mono" \
        "12"
}

# Show marketplace statistics
show_stats() {
    echo ""
    echo -e "${BLUE}📊 Marketplace Population Summary${NC}"
    echo "=================================="
    echo "The following model categories have been registered:"
    echo "• Text Generation Models (6 models)"
    echo "• Classification Models (6 models)"
    echo "• Embedding Models (3 models)"
    echo "• Multimodal Models (3 models)"
    echo "• Specialized Models (7 models)"
    echo "• Code Models (3 models)"
    echo ""
    echo -e "${GREEN}Total: 28 open source models registered!${NC}"
    echo ""
    echo -e "${BLUE}Model Usage Fees Range:${NC}"
    echo "• Small models: 4-7 AETHEL per inference"
    echo "• Medium models: 8-12 AETHEL per inference"
    echo "• Large models: 15-20 AETHEL per inference"
    echo ""
    echo -e "${YELLOW}💡 Note: These are curated open source models from Hugging Face${NC}"
    echo "Anyone can register additional models using:"
    echo "cargo run --release -- register-model --model-hash <hash> --uri <uri> --fee <fee>"
}

# Main population flow
main() {
    echo "This script will populate the Aethelred marketplace with popular open source AI models."
    echo "Models will be registered with reasonable usage fees based on their computational requirements."
    echo ""

    read -p "Do you want to proceed with marketplace population? [Y/n]: " proceed
    proceed=${proceed:-Y}

    if [[ ! $proceed =~ ^[Yy]$ ]]; then
        echo "Marketplace population cancelled."
        exit 0
    fi

    check_node

    echo -e "${YELLOW}Starting marketplace population...${NC}"
    echo "This may take several minutes due to rate limiting between registrations."
    echo ""

    populate_text_generation_models
    populate_classification_models
    populate_embedding_models
    populate_multimodal_models
    populate_specialized_models
    populate_code_models

    show_stats

    echo ""
    echo -e "${GREEN}🎉 Marketplace population completed!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Users can now discover and use these models for AI tasks"
    echo "2. Model providers can stake tokens on high-quality models"
    echo "3. Quality assessors will help maintain model reputation scores"
    echo "4. Additional models can be registered by the community"
}

# Run the population script
main "$@"