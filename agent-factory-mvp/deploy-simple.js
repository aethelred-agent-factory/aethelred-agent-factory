import { ethers } from 'ethers';
import fs from 'fs';

// Load wallet info
const walletInfo = JSON.parse(fs.readFileSync('.wallet-arbitrum-sepolia.json', 'utf8'));

// Connect to Arbitrum Sepolia
const provider = new ethers.JsonRpcProvider(walletInfo.rpcUrl);
const wallet = new ethers.Wallet(walletInfo.privateKey, provider);

console.log('🚀 Starting Arbitrum Sepolia Deployment...');
console.log('==========================================');
console.log('📍 Deploying from:', wallet.address);

// Check balance
const balance = await provider.getBalance(wallet.address);
console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');

if (parseFloat(ethers.formatEther(balance)) < 0.01) {
  console.log('❌ Insufficient balance for deployment');
  process.exit(1);
}

// We'll need to compile and get bytecode first
// For now, let's just confirm the connection works
console.log('✅ Connected to Arbitrum Sepolia');
console.log('📦 Chain ID:', (await provider.getNetwork()).chainId);
console.log('📦 Latest block:', await provider.getBlockNumber());

console.log('\n📝 Note: For actual deployment, we need compiled contract bytecode.');
console.log('   This confirms our wallet and network connection work correctly.');
console.log('\n🎯 Ready for contract deployment once compilation is working!');