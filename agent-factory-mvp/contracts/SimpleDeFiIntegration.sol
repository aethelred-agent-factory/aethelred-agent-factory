// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract SimpleDeFiIntegration {
    address public owner;
    
    struct Pool {
        address poolAddress;
        address tokenA;
        address tokenB;
        uint256 fee;
        bool active;
    }
    
    struct Position {
        address agent;
        address protocol;
        address token;
        uint256 amount;
        uint256 timestamp;
        bool active;
    }
    
    mapping(uint256 => Pool) public pools;
    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) public agentPositions;
    
    uint256 public poolCount;
    uint256 public positionCount;
    
    event PoolAdded(uint256 indexed poolId, address poolAddress, address tokenA, address tokenB);
    event PositionOpened(uint256 indexed positionId, address indexed agent, address protocol, uint256 amount);
    event PositionClosed(uint256 indexed positionId, address indexed agent);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    function addPool(address poolAddress, address tokenA, address tokenB, uint256 fee) external onlyOwner returns (uint256) {
        uint256 poolId = poolCount++;
        pools[poolId] = Pool({
            poolAddress: poolAddress,
            tokenA: tokenA,
            tokenB: tokenB,
            fee: fee,
            active: true
        });
        
        emit PoolAdded(poolId, poolAddress, tokenA, tokenB);
        return poolId;
    }
    
    function openPosition(address agent, address protocol, address token, uint256 amount) external returns (uint256) {
        uint256 positionId = positionCount++;
        positions[positionId] = Position({
            agent: agent,
            protocol: protocol,
            token: token,
            amount: amount,
            timestamp: block.timestamp,
            active: true
        });
        
        agentPositions[agent].push(positionId);
        
        emit PositionOpened(positionId, agent, protocol, amount);
        return positionId;
    }
    
    function closePosition(uint256 positionId) external {
        Position storage position = positions[positionId];
        require(position.active, "Position not active");
        require(msg.sender == position.agent || msg.sender == owner, "Not authorized");
        
        position.active = false;
        emit PositionClosed(positionId, position.agent);
    }
    
    function getAgentPositions(address agent) external view returns (uint256[] memory) {
        return agentPositions[agent];
    }
    
    function getActivePositionsCount(address agent) external view returns (uint256 count) {
        uint256[] memory agentPosIds = agentPositions[agent];
        for (uint i = 0; i < agentPosIds.length; i++) {
            if (positions[agentPosIds[i]].active) {
                count++;
            }
        }
    }
}