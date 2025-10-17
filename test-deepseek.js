#!/usr/bin/env node

// Test script specifically for DeepSeek API integration
import dotenv from 'dotenv';
import { queryDecentralizedAI } from './bridge/aethelred-integration.js';

// Load test environment  
dotenv.config({ path: '.env.test' });

console.log('🔬 Testing DeepSeek API Integration');
console.log('='.repeat(40));

async function testDeepSeekAPI() {
    try {
        const mockMarketData = {
            timestamp: Date.now(),
            symbol: 'WETH/USDC',
            price: 2150.50,
            volume: 1234567,
            trend: 'bullish',
            priceChange24h: 5.2,
            volatility: 0.15,
            technicalIndicators: {
                rsi: 65,
                macd: 'positive',
                movingAverage: 'above'
            }
        };

        console.log('\n📊 Market Data:', JSON.stringify(mockMarketData, null, 2));

        // Force DeepSeek API usage by disabling Aethelred
        console.log('\n🤖 Testing DeepSeek API directly...');
        const response = await queryDecentralizedAI(mockMarketData, {
            useAethelred: false, // Force DeepSeek usage
            fallbackToDeepSeek: true,
            deepSeekApiKey: process.env.DEEPSEEK_API_KEY,
            timeout: 15000
        });

        console.log('\n✅ DeepSeek Response:');
        console.log(JSON.stringify(response, null, 2));

        // Validate response structure (direct format from bridge)
        const isValidResponse = response && 
                               response.source &&
                               response.action &&
                               typeof response.action === 'string' &&
                               typeof response.confidence === 'number';

        if (isValidResponse) {
            console.log('\n🎯 Response Validation: ✅ PASSED');
            console.log(`- Source: ${response.source}`);
            console.log(`- Action: ${response.action}`);
            console.log(`- Confidence: ${response.confidence}`);
            console.log(`- Has reasoning: ${!!response.reasoning}`);
            console.log(`- Verified: ${response.verified}`);
        } else {
            console.log('\n❌ Response Validation: FAILED');
            console.log('Expected: { source, action, confidence, reasoning, verified }');
            console.log('Actual keys:', Object.keys(response));
        }

    } catch (error) {
        console.error('\n❌ DeepSeek test failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        // Check if it's an API key issue
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
            console.log('\n💡 Hint: Check if the DEEPSEEK_API_KEY is valid');
        }
        
        process.exit(1);
    }
}

testDeepSeekAPI().then(() => {
    console.log('\n🎉 DeepSeek API test completed successfully!');
    process.exit(0);
});