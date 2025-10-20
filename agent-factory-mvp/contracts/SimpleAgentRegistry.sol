// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract SimpleAgentRegistry {
    address public owner;
    address public immutable agentFactory;
    
    struct AgentInfo {
        uint256 agentId;
        address agentOwner;
        address wallet;
        uint256 strategyId;
        bool active;
        uint256 totalTrades;
        int256 pnl; // Profit and Loss in basis points
        uint256 lastActivity;
    }
    
    struct Strategy {
        string name;
        string description;
        uint256 riskLevel; // 1-10 scale
        uint256 maxPositionSize;
        bool active;
    }
    
    uint256 private _strategyCounter;
    
    mapping(uint256 => AgentInfo) public agents;
    mapping(address => uint256[]) public userAgents;
    mapping(uint256 => Strategy) public strategies;
    
    uint256[] public activeAgents;
    mapping(uint256 => uint256) private activeAgentIndex;
    
    event AgentRegistered(uint256 indexed agentId, address indexed owner, uint256 strategyId);
    event AgentActivated(uint256 indexed agentId);
    event AgentDeactivated(uint256 indexed agentId);
    event StrategyAdded(uint256 indexed strategyId, string name);
    event TradeExecuted(uint256 indexed agentId, int256 pnl);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor(address _agentFactory) {
        owner = msg.sender;
        agentFactory = _agentFactory;
    }
    
    function addStrategy(string memory name, string memory description, uint256 riskLevel, uint256 maxPositionSize) external onlyOwner returns (uint256) {
        uint256 strategyId = _strategyCounter++;
        strategies[strategyId] = Strategy({
            name: name,
            description: description,
            riskLevel: riskLevel,
            maxPositionSize: maxPositionSize,
            active: true
        });
        
        emit StrategyAdded(strategyId, name);
        return strategyId;
    }
    
    function registerAgent(uint256 agentId, address agentOwner, address wallet, uint256 strategyId) external {
        require(strategies[strategyId].active, "Strategy not active");
        require(agents[agentId].agentId == 0, "Agent already registered");
        
        agents[agentId] = AgentInfo({
            agentId: agentId,
            agentOwner: agentOwner,
            wallet: wallet,
            strategyId: strategyId,
            active: true,
            totalTrades: 0,
            pnl: 0,
            lastActivity: block.timestamp
        });
        
        userAgents[agentOwner].push(agentId);
        
        // Add to active agents list
        activeAgentIndex[agentId] = activeAgents.length;
        activeAgents.push(agentId);
        
        emit AgentRegistered(agentId, agentOwner, strategyId);
        emit AgentActivated(agentId);
    }
    
    function deactivateAgent(uint256 agentId) external {
        AgentInfo storage agent = agents[agentId];
        require(agent.agentId != 0, "Agent not found");
        require(msg.sender == agent.agentOwner || msg.sender == owner, "Not authorized");
        require(agent.active, "Agent already inactive");
        
        agent.active = false;
        
        // Remove from active agents list
        uint256 index = activeAgentIndex[agentId];
        uint256 lastAgentId = activeAgents[activeAgents.length - 1];
        
        activeAgents[index] = lastAgentId;
        activeAgentIndex[lastAgentId] = index;
        
        activeAgents.pop();
        delete activeAgentIndex[agentId];
        
        emit AgentDeactivated(agentId);
    }
    
    function updateAgentPnL(uint256 agentId, int256 tradePnL) external {
        AgentInfo storage agent = agents[agentId];
        require(agent.agentId != 0, "Agent not found");
        require(agent.active, "Agent not active");
        
        agent.pnl += tradePnL;
        agent.totalTrades++;
        agent.lastActivity = block.timestamp;
        
        emit TradeExecuted(agentId, tradePnL);
    }
    
    function getActiveAgentsCount() external view returns (uint256) {
        return activeAgents.length;
    }
    
    function getUserAgents(address user) external view returns (uint256[] memory) {
        return userAgents[user];
    }
    
    function getAgentInfo(uint256 agentId) external view returns (AgentInfo memory) {
        return agents[agentId];
    }
    
    function getStrategy(uint256 strategyId) external view returns (Strategy memory) {
        return strategies[strategyId];
    }
}