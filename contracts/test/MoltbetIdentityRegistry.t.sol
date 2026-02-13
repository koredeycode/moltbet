// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MoltbetIdentityRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MoltbetIdentityRegistryTest is Test {
    MoltbetIdentityRegistry public identity;
    
    address public agent1 = address(0x2);
    address public agent2 = address(0x3);
    
    function setUp() public {
        identity = new MoltbetIdentityRegistry();
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Registration Tests
    // ─────────────────────────────────────────────────────────────────────────
    
    function test_NewAgent() public {
        uint256 fee = identity.REGISTRATION_FEE();
        
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        uint256 agentId = identity.newAgent{value: fee}("agent1.com", agent1);
        
        assertEq(agentId, 1);
        assertEq(identity.getAgentCount(), 1);
        
        IIdentityRegistry.AgentInfo memory info = identity.getAgent(agentId);
        assertEq(info.agentDomain, "agent1.com");
        assertEq(info.agentAddress, agent1);
        
        // Check lookups
        IIdentityRegistry.AgentInfo memory infoByDomain = identity.resolveByDomain("agent1.com");
        assertEq(infoByDomain.agentId, agentId);
        
        IIdentityRegistry.AgentInfo memory infoByAddress = identity.resolveByAddress(agent1);
        assertEq(infoByAddress.agentId, agentId);
    }
    
    function test_NewAgent_InsufficientFee() public {
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        vm.expectRevert(IIdentityRegistry.InsufficientFee.selector);
        identity.newAgent{value: 0}("agent1.com", agent1);
    }
    
    function test_NewAgent_DuplicateDomain() public {
        uint256 fee = identity.REGISTRATION_FEE();
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        identity.newAgent{value: fee}("agent1.com", agent1);
        
        vm.deal(agent2, 1 ether);
        vm.prank(agent2);
        vm.expectRevert(IIdentityRegistry.DomainAlreadyRegistered.selector);
        identity.newAgent{value: fee}("agent1.com", agent2);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Update Tests
    // ─────────────────────────────────────────────────────────────────────────
    
    function test_UpdateAgent() public {
        uint256 fee = identity.REGISTRATION_FEE();
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        uint256 agentId = identity.newAgent{value: fee}("agent1.com", agent1);
        
        vm.prank(agent1);
        identity.updateAgent(agentId, "new-domain.com", address(0));
        
        IIdentityRegistry.AgentInfo memory info = identity.getAgent(agentId);
        assertEq(info.agentDomain, "new-domain.com");
        
        // Old domain should be free
        vm.deal(agent2, 1 ether);
        vm.prank(agent2);
        identity.newAgent{value: fee}("agent1.com", agent2);
    }
    
    function test_UpdateAgent_Unauthorized() public {
        uint256 fee = identity.REGISTRATION_FEE();
        vm.deal(agent1, 1 ether);
        vm.prank(agent1);
        uint256 agentId = identity.newAgent{value: fee}("agent1.com", agent1);
        
        vm.prank(agent2);
        vm.expectRevert(IIdentityRegistry.UnauthorizedUpdate.selector);
        identity.updateAgent(agentId, "hacker.com", address(0));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Withdrawal Tests
    // ─────────────────────────────────────────────────────────────────────────

    function test_Withdraw() public {
        uint256 fee = identity.REGISTRATION_FEE();
        vm.deal(agent1, 1 ether);
        
        // Register an agent to pay fee
        vm.prank(agent1);
        identity.newAgent{value: fee}("agent1.com", agent1);
        
        assertEq(address(identity).balance, fee);
        
        uint256 ownerBalanceBefore = address(this).balance;
        
        // Withdraw as owner (test contract is owner)
        identity.withdraw();
        
        assertEq(address(identity).balance, 0);
        assertEq(address(this).balance, ownerBalanceBefore + fee);
    }

    function test_Withdraw_Unauthorized() public {
        uint256 fee = identity.REGISTRATION_FEE();
        vm.deal(agent1, 1 ether);
        
        // Register an agent to pay fee
        vm.prank(agent1);
        identity.newAgent{value: fee}("agent1.com", agent1);
        
        // Attempt withdraw as non-owner
        vm.prank(agent1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, agent1));
        identity.withdraw();
    }

    // Allow the test contract to receive ETH
    receive() external payable {}
}
