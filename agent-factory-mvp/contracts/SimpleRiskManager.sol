// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract SimpleRiskManager {
    address public owner;
    
    struct RiskParameters {
        uint256 maxPositionSize; // Max position size in basis points (10000 = 100%)
        uint256 maxDailyLoss; // Max daily loss in basis points
        uint256 maxDrawdown; // Max drawdown from peak in basis points
        bool stopLossEnabled;
        uint256 stopLossThreshold; // Stop loss threshold in basis points
    }
    
    mapping(address => RiskParameters) public agentRiskParams;
    mapping(address => uint256) public agentTotalValue;
    mapping(address => uint256) public agentDailyPnL;
    mapping(address => uint256) public agentPeakValue;
    mapping(address => bool) public riskBreach;
    
    event RiskParametersSet(address indexed agent, RiskParameters params);
    event RiskBreachDetected(address indexed agent, string reason);
    event RiskBreachCleared(address indexed agent);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function setRiskParameters(address agent, RiskParameters memory params) external onlyOwner {
        agentRiskParams[agent] = params;
        emit RiskParametersSet(agent, params);
    }
    
    function checkRisk(address agent, uint256 currentValue) external view returns (bool allowed) {
        RiskParameters memory params = agentRiskParams[agent];
        
        // Check max position size
        if (currentValue > params.maxPositionSize) {
            return false;
        }
        
        // Check if risk breach is already flagged
        if (riskBreach[agent]) {
            return false;
        }
        
        return true;
    }
    
    function updateAgentValue(address agent, uint256 newValue) external {
        uint256 oldValue = agentTotalValue[agent];
        agentTotalValue[agent] = newValue;
        
        // Update peak value
        if (newValue > agentPeakValue[agent]) {
            agentPeakValue[agent] = newValue;
        }
        
        // Calculate daily PnL
        if (oldValue > 0) {
            if (newValue > oldValue) {
                agentDailyPnL[agent] = ((newValue - oldValue) * 10000) / oldValue;
            } else {
                agentDailyPnL[agent] = ((oldValue - newValue) * 10000) / oldValue;
            }
        }
        
        // Check for risk breach
        _checkRiskBreach(agent);
    }
    
    function _checkRiskBreach(address agent) internal {
        RiskParameters memory params = agentRiskParams[agent];
        uint256 currentValue = agentTotalValue[agent];
        uint256 peakValue = agentPeakValue[agent];
        
        // Check drawdown
        if (peakValue > 0 && currentValue < peakValue) {
            uint256 drawdown = ((peakValue - currentValue) * 10000) / peakValue;
            if (drawdown > params.maxDrawdown) {
                riskBreach[agent] = true;
                emit RiskBreachDetected(agent, "Max drawdown exceeded");
                return;
            }
        }
        
        // Check daily loss
        if (agentDailyPnL[agent] > params.maxDailyLoss) {
            riskBreach[agent] = true;
            emit RiskBreachDetected(agent, "Max daily loss exceeded");
            return;
        }
    }
    
    function clearRiskBreach(address agent) external onlyOwner {
        riskBreach[agent] = false;
        emit RiskBreachCleared(agent);
    }
}