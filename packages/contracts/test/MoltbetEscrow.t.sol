// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MoltbetEscrow.sol";
import "../src/interfaces/IIdentityRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock USDC for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock Identity Registry
contract MockIdentityRegistry is IIdentityRegistry {
    struct MockAgent {
        uint256 id;
        string domain;
        address addr;
    }
    
    mapping(address => MockAgent) public agents;
    
    function register(address agent, uint256 id) external {
        agents[agent] = MockAgent(id, "test.agent", agent);
    }
    
    function resolveByAddress(address agentAddress) external view override returns (AgentInfo memory) {
        MockAgent memory agent = agents[agentAddress];
        if (agent.id == 0) revert("Agent not found"); // Simulate revert or return empty depending on impl
        return AgentInfo(agent.id, agent.domain, agent.addr);
    }
    
    function getAgent(uint256) external pure override returns (AgentInfo memory) {
        return AgentInfo(0, "", address(0));
    }
    
    function REGISTRATION_FEE() external pure returns (uint256) {
        return 0.005 ether;
    }

    function getAgentCount() external pure returns (uint256) {
        return 0;
    }

    function newAgent(string calldata, address) external payable returns (uint256) {
        return 1;
    }

    function resolveByDomain(string calldata) external pure returns (AgentInfo memory) {
        return AgentInfo(0, "", address(0));
    }
    
    function updateAgent(uint256, string calldata, address) external pure returns (bool) {
        return true;
    }

    function agentExists(uint256) external pure override returns (bool) {
        return true;
    }
}

contract MoltbetEscrowTest is Test {
    MoltbetEscrow public escrow;
    MockUSDC public usdc;
    MockIdentityRegistry public identityRegistry;
    
    address public owner = address(this);
    // address public facilitator = address(0x1); // No longer needed as explicit facilitator role for creation
    address public proposer = address(0x2);
    address public counter = address(0x3);
    address public unregistered = address(0x4);
    
    bytes32 public betId = keccak256("test-bet-1");
    uint256 public stake = 10 * 1e6; // 10 USDC
    uint256 public expiresAt;
    string public metadataHash = "ipfs://QmTest";
    
    function setUp() public {
        usdc = new MockUSDC();
        identityRegistry = new MockIdentityRegistry();
        
        // Register agents
        identityRegistry.register(proposer, 1);
        identityRegistry.register(counter, 2);
        
        escrow = new MoltbetEscrow(address(usdc), address(identityRegistry));
        
        // Mint USDC to test accounts
        usdc.mint(proposer, 1000 * 1e6);
        usdc.mint(counter, 1000 * 1e6);
        
        // Approve escrow
        vm.prank(proposer);
        usdc.approve(address(escrow), type(uint256).max);
        
        vm.prank(counter);
        usdc.approve(address(escrow), type(uint256).max);
        
        expiresAt = block.timestamp + 7 days;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Create Bet Tests
    // ─────────────────────────────────────────────────────────────────────────
    
    function test_CreateBet() public {
        vm.prank(proposer);
        escrow.createBet(betId, stake, expiresAt, metadataHash);
        
        (
            address _proposer,
            address _counter,
            uint256 _stake,
            string memory _metadataHash,
            MoltbetEscrow.BetStatus _status,
            ,
            
        ) = escrow.getBet(betId);
        
        assertEq(_proposer, proposer);
        assertEq(_counter, address(0));
        assertEq(_stake, stake);
        assertEq(_metadataHash, metadataHash);
        assertEq(uint8(_status), uint8(MoltbetEscrow.BetStatus.Open));
        
        // Check USDC transferred
        assertEq(usdc.balanceOf(address(escrow)), stake);
    }
    
    function test_CreateBet_Unregistered() public {
        vm.prank(unregistered);
        vm.expectRevert("Identity check failed"); // The catch block reverts with this generic message
        escrow.createBet(betId, stake, expiresAt, metadataHash);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Match Bet Tests
    // ─────────────────────────────────────────────────────────────────────────
    
    function test_MatchBet() public {
        vm.prank(proposer);
        escrow.createBet(betId, stake, expiresAt, metadataHash);
        
        vm.prank(counter);
        escrow.matchBet(betId);
        
        (
            ,
            address _counter,
            ,
            ,
            MoltbetEscrow.BetStatus _status,
            ,
            
        ) = escrow.getBet(betId);
        
        assertEq(_counter, counter);
        assertEq(uint8(_status), uint8(MoltbetEscrow.BetStatus.Matched));
        
        // Check total pot
        assertEq(usdc.balanceOf(address(escrow)), stake * 2);
        assertEq(escrow.getPot(betId), stake * 2);
    }
    
    function test_MatchBet_CannotSelfMatch() public {
        vm.prank(proposer);
        escrow.createBet(betId, stake, expiresAt, metadataHash);
        
        vm.prank(proposer);
        vm.expectRevert("Cannot self-match");
        escrow.matchBet(betId);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Resolve Tests
    // ─────────────────────────────────────────────────────────────────────────
    
    function test_Resolve_ProposerWins() public {
        vm.prank(proposer);
        escrow.createBet(betId, stake, expiresAt, metadataHash);
        
        vm.prank(counter);
        escrow.matchBet(betId);
        
        uint256 proposerBalanceBefore = usdc.balanceOf(proposer);
        
        vm.prank(owner); // Owner (Facilitator) resolves
        escrow.resolve(betId, proposer);
        
        // Winner gets both stakes
        assertEq(usdc.balanceOf(proposer), proposerBalanceBefore + stake * 2);
        assertEq(usdc.balanceOf(address(escrow)), 0);
        
        (,,,, MoltbetEscrow.BetStatus _status,,) = escrow.getBet(betId);
        assertEq(uint8(_status), uint8(MoltbetEscrow.BetStatus.Resolved));
    }
    
    function test_Resolve_CounterWins() public {
        vm.prank(proposer);
        escrow.createBet(betId, stake, expiresAt, metadataHash);
        
        vm.prank(counter);
        escrow.matchBet(betId);
        
        uint256 counterBalanceBefore = usdc.balanceOf(counter);
        
        vm.prank(owner);
        escrow.resolve(betId, counter);
        
        assertEq(usdc.balanceOf(counter), counterBalanceBefore + stake * 2);
    }
    
    function test_Resolve_OnlyOwner() public {
        vm.prank(proposer);
        escrow.createBet(betId, stake, expiresAt, metadataHash);
        
        vm.prank(counter);
        escrow.matchBet(betId);
        
        vm.prank(proposer);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, proposer));
        escrow.resolve(betId, proposer);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Cancel Tests
    // ─────────────────────────────────────────────────────────────────────────
    
    function test_Cancel() public {
        vm.prank(proposer);
        escrow.createBet(betId, stake, expiresAt, metadataHash);
        
        uint256 proposerBalanceBefore = usdc.balanceOf(proposer);
        
        vm.prank(proposer);
        escrow.cancel(betId);
        
        assertEq(usdc.balanceOf(proposer), proposerBalanceBefore + stake);
        
        (,,,, MoltbetEscrow.BetStatus _status,,) = escrow.getBet(betId);
        assertEq(uint8(_status), uint8(MoltbetEscrow.BetStatus.Cancelled));
    }
    
    function test_Cancel_OnlyProposer() public {
        vm.prank(proposer);
        escrow.createBet(betId, stake, expiresAt, metadataHash);
        
        vm.prank(counter);
        vm.expectRevert("Only proposer can cancel");
        escrow.cancel(betId);
    }
}
