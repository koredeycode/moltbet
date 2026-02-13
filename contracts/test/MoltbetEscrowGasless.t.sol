// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MoltbetEscrow.sol";
import "../src/interfaces/IIdentityRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

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
        if (agent.id == 0) revert("Agent not found");
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

contract MockUSDC is ERC20, EIP712 {
    constructor() ERC20("USD Coin", "USDC") EIP712("USD Coin", "2") {}
    
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    // EIP-2612 Permit
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        require(block.timestamp <= deadline, "ERC20Permit: expired deadline");

        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces(owner), deadline));

        bytes32 hash = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(hash, v, r, s);
        require(signer == owner, "ERC20Permit: invalid signature");

        _approve(owner, spender, value);
    }

    // Mock nonces
    mapping(address => uint256) private _nonces;
    function nonces(address owner) public view returns (uint256) {
        return _nonces[owner];
    }
    
    // Expose DOMAIN_SEPARATOR for testing
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}

contract MoltbetEscrowGaslessTest is Test {
    MoltbetEscrow public escrow;
    MockIdentityRegistry public registry;
    MockUSDC public usdc;

    uint256 public proposerKey;
    address public proposer;
    
    uint256 public counterKey;
    address public counter;
    
    uint256 public facilitatorKey;
    address public facilitator;

    bytes32 constant _CREATE_BET_TYPEHASH = keccak256("CreateBet(bytes32 betId,uint256 stake,uint256 expiresAt,string metadataHash,uint256 nonce,uint256 deadline)");
    bytes32 constant _MATCH_BET_TYPEHASH = keccak256("MatchBet(bytes32 betId,uint256 nonce,uint256 deadline)");

    function setUp() public {
        proposerKey = 0xA11CE;
        proposer = vm.addr(proposerKey);
        
        counterKey = 0xB0B;
        counter = vm.addr(counterKey);
        
        facilitatorKey = 0xFACE;
        facilitator = vm.addr(facilitatorKey);

        usdc = new MockUSDC();
        registry = new MockIdentityRegistry();
        
        // Register agents
        registry.register(proposer, 1);
        registry.register(counter, 2);

        escrow = new MoltbetEscrow(address(usdc), address(registry));

        // Fund agents
        usdc.mint(proposer, 1000 * 10**6);
        usdc.mint(counter, 1000 * 10**6);
    }

    function testGaslessCreate() public {
        bytes32 betId = keccak256("bet1");
        uint256 stake = 100 * 10**6;
        uint256 expiresAt = block.timestamp + 1 days;
        string memory metadataHash = "ipfs://QmTest";
        uint256 deadline = block.timestamp + 1 hours;

        // 1. Sign Permit (USDC)
        bytes32 usdcDomainSeparator = usdc.DOMAIN_SEPARATOR();
        bytes32 permitTypeHash = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        
        bytes32 permitStructHash = keccak256(abi.encode(
            permitTypeHash,
            proposer,
            address(escrow),
            stake,
            0, // nonce
            deadline
        ));
        
        bytes32 permitDigest = keccak256(abi.encodePacked(
            "\x19\x01",
            usdcDomainSeparator,
            permitStructHash
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(proposerKey, permitDigest);

        // 2. Sign CreateBet (Escrow)
        bytes32 escrowDomainSeparator = escrow.DOMAIN_SEPARATOR();
        
        bytes32 createStructHash = keccak256(abi.encode(
            _CREATE_BET_TYPEHASH,
            betId,
            stake,
            expiresAt,
            keccak256(bytes(metadataHash)),
            0, // Escrow nonce for proposer
            deadline
        ));

        bytes32 createDigest = keccak256(abi.encodePacked(
            "\x19\x01",
            escrowDomainSeparator,
            createStructHash
        ));
        
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(proposerKey, createDigest);
        bytes memory signature = abi.encodePacked(r2, s2, v2);

        // 3. Submit (Facilitator)
        vm.prank(facilitator);
        escrow.createBetWithPermit(
            proposer,
            betId,
            stake,
            expiresAt,
            metadataHash,
            deadline,
            v, r, s,
            signature
        );

        // Verify
        (address p, , uint256 s_amount, , , , ) = escrow.getBet(betId);
        assertEq(p, proposer);
        assertEq(s_amount, stake);
        assertEq(usdc.balanceOf(address(escrow)), stake);
    }

    function testGaslessMatch() public {
        // Setup initial bet
        bytes32 betId = keccak256("bet1");
        uint256 stake = 100 * 10**6;
        uint256 expiresAt = block.timestamp + 1 days;
        string memory metadataHash = "ipfs://QmTest";
        
        vm.prank(proposer);
        usdc.approve(address(escrow), stake);
        vm.prank(proposer);
        escrow.createBet(betId, stake, expiresAt, metadataHash);

        uint256 deadline = block.timestamp + 1 hours;

        // 1. Sign Permit (USDC) for Counter
        bytes32 usdcDomainSeparator = usdc.DOMAIN_SEPARATOR();
        bytes32 permitTypeHash = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        
        bytes32 permitStructHash = keccak256(abi.encode(
            permitTypeHash,
            counter,
            address(escrow),
            stake,
            0, // nonce
            deadline
        ));
        
        bytes32 permitDigest = keccak256(abi.encodePacked(
            "\x19\x01",
            usdcDomainSeparator,
            permitStructHash
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(counterKey, permitDigest);

        // 2. Sign MatchBet (Escrow)
        bytes32 escrowDomainSeparator = escrow.DOMAIN_SEPARATOR();
        
        bytes32 matchStructHash = keccak256(abi.encode(
            _MATCH_BET_TYPEHASH,
            betId,
            0, // Escrow nonce for counter
            deadline
        ));

        bytes32 matchDigest = keccak256(abi.encodePacked(
            "\x19\x01",
            escrowDomainSeparator,
            matchStructHash
        ));
        
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(counterKey, matchDigest);
        bytes memory signature = abi.encodePacked(r2, s2, v2);

        // 3. Submit (Facilitator)
        vm.prank(facilitator);
        escrow.matchBetWithPermit(
            counter,
            betId,
            deadline,
            v, r, s,
            signature
        );

        // Verify
        (address p, address c, , , MoltbetEscrow.BetStatus status, , ) = escrow.getBet(betId);
        assertEq(p, proposer);
        assertEq(c, counter);
        assertEq(uint8(status), uint8(MoltbetEscrow.BetStatus.Matched));
        assertEq(usdc.balanceOf(address(escrow)), stake * 2);
    }
}
