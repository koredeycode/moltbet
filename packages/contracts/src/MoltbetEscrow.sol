// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IIdentityRegistry.sol";

/**
 * @title MoltEscrow
 * @notice Escrow contract for 1v1 betting stakes
 * @dev Handles USDC deposits, matching, and resolution.
 *      Updated to work with ERC-8004 struct-based IdentityRegistry.
 * 
 * Flow:
 * 1. Proposer (Registered Agent) creates bet with stake.
 * 2. Counter (Registered Agent) matches the stake.
 * 3. Facilitator (Owner) resolves and pays winner.
 */
contract MoltbetEscrow is Ownable, ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    
    // ─────────────────────────────────────────────────────────────────────────
    // Types
    // ─────────────────────────────────────────────────────────────────────────
    
    enum BetStatus {
        Open,       // Waiting for counter
        Matched,    // Both stakes locked
        Resolved,   // Winner paid
        Cancelled   // Refunded
    }
    
    struct Bet {
        bytes32 id;
        address proposer;
        address counter;
        uint256 stake;
        string metadataHash;
        BetStatus status;
        uint256 createdAt;
        uint256 expiresAt;
    }
    
    // EIP-712 Type Hashes
    bytes32 private constant _CREATE_BET_TYPEHASH = keccak256("CreateBet(bytes32 betId,uint256 stake,uint256 expiresAt,string metadataHash,uint256 nonce,uint256 deadline)");
    bytes32 private constant _MATCH_BET_TYPEHASH = keccak256("MatchBet(bytes32 betId,uint256 nonce,uint256 deadline)");
    bytes32 private constant _CANCEL_BET_TYPEHASH = keccak256("CancelBet(bytes32 betId,uint256 nonce,uint256 deadline)");
    
    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────
    
    IERC20 public immutable usdc;
    IIdentityRegistry public immutable identityRegistry;
    
    mapping(bytes32 => Bet) public bets;
    mapping(address => uint256) public nonces;
    
    // ─────────────────────────────────────────────────────────────────────────
    // Events
    // ─────────────────────────────────────────────────────────────────────────
    
    event BetCreated(
        bytes32 indexed betId,
        address indexed proposer,
        uint256 stake,
        string metadataHash,
        uint256 expiresAt
    );
    
    event BetMatched(
        bytes32 indexed betId,
        address indexed counter
    );
    
    event BetResolved(
        bytes32 indexed betId,
        address indexed winner,
        uint256 payout
    );
    
    event BetCancelled(
        bytes32 indexed betId,
        address indexed proposer
    );
    
    // ─────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ─────────────────────────────────────────────────────────────────────────
    
    modifier onlyRegisteredAgent(address agent) {
        _checkRegisteredAgent(agent);
        _;
    }
    
    function _checkRegisteredAgent(address agent) internal view {
        try identityRegistry.resolveByAddress(agent) returns (IIdentityRegistry.AgentInfo memory info) {
            require(info.agentId > 0, "Agent not registered");
        } catch {
            revert("Identity check failed");
        }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Constructor
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * @param _usdc USDC token address
     * @param _identityRegistry Identity Registry address
     */
    constructor(address _usdc, address _identityRegistry) 
        Ownable(msg.sender) 
        EIP712("MoltbetEscrow", "1") 
    {
        require(_usdc != address(0), "Invalid USDC");
        require(_identityRegistry != address(0), "Invalid Identity Registry");
        
        usdc = IERC20(_usdc);
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Bet Lifecycle (Gasless / Meta-Transactions)
    // ─────────────────────────────────────────────────────────────────────────



    function createBetWithPermit(
        address proposer,
        bytes32 betId,
        uint256 stake,
        uint256 expiresAt,
        string calldata metadataHash,
        uint256 deadline,
        uint8 v, bytes32 r, bytes32 s, // Permit signature
        bytes memory signature // Proposer's signature of the intent
    ) external nonReentrant onlyRegisteredAgent(proposer) {
        require(block.timestamp <= deadline, "Signature expired");
        require(bets[betId].id == bytes32(0), "Bet exists");
        require(stake > 0, "Invalid stake");
        require(expiresAt > block.timestamp, "Already expired");

        // 1. Verify Proposer Signature
        bytes32 structHash = keccak256(abi.encode(
            _CREATE_BET_TYPEHASH,
            betId,
            stake,
            expiresAt,
            keccak256(bytes(metadataHash)),
            nonces[proposer]++, // Increment nonce
            deadline
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        require(signer == proposer, "Invalid signature");

        // 2. Execute Permit (if applicable - assumes USDC supports permit)
        // USDC on Base (and most L2s) implements EIP-2612 Permit or similar.
        // Function: permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        try IERC20Permit(address(usdc)).permit(proposer, address(this), stake, deadline, v, r, s) {
            // Permit successful
        } catch {
            // Fallback: If permit fails, check if allowance is already sufficient (maybe they did verify/approve separately)
            // Or revert if permit was expected.
            // For this flow, we expect permit to work.
            revert("Permit failed");
        }

        // 3. Transfer Funds
        usdc.safeTransferFrom(proposer, address(this), stake);

        // 4. Create Bet
        bets[betId] = Bet({
            id: betId,
            proposer: proposer,
            counter: address(0),
            stake: stake,
            metadataHash: metadataHash,
            status: BetStatus.Open,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });

        emit BetCreated(betId, proposer, stake, metadataHash, expiresAt);
    }

    /**
     * @notice Match a bet with permit and signature
     */
    function matchBetWithPermit(
        address counter,
        bytes32 betId,
        uint256 deadline,
        uint8 v, bytes32 r, bytes32 s, // Permit signature
        bytes memory signature // Counter's signature of intent
    ) external nonReentrant onlyRegisteredAgent(counter) {
        require(block.timestamp <= deadline, "Signature expired");
        Bet storage bet = bets[betId];
        
        require(bet.id != bytes32(0), "Bet not found");
        require(bet.status == BetStatus.Open, "Bet not open");
        require(block.timestamp < bet.expiresAt, "Bet expired");
        require(counter != bet.proposer, "Cannot self-match");

        // 1. Verify Counter Signature
        bytes32 structHash = keccak256(abi.encode(
            _MATCH_BET_TYPEHASH,
            betId,
            nonces[counter]++, // Increment nonce
            deadline
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        require(signer == counter, "Invalid signature");

        // 2. Execute Permit
        try IERC20Permit(address(usdc)).permit(counter, address(this), bet.stake, deadline, v, r, s) {
        } catch {
            revert("Permit failed");
        }

        // 3. Transfer Funds
        usdc.safeTransferFrom(counter, address(this), bet.stake);

        // 4. Update Bet
        bet.counter = counter;
        bet.status = BetStatus.Matched;

        emit BetMatched(betId, counter);
    }

    /**
     * @notice Cancel a bet with signature
     */
    function cancelBetWithPermit(
        bytes32 betId,
        uint256 deadline,
        bytes memory signature // Proposer's signature of intent
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Signature expired");
        Bet storage bet = bets[betId];
        
        require(bet.id != bytes32(0), "Bet not found");
        require(bet.status == BetStatus.Open, "Bet not open");
        
        // 1. Verify Proposer Signature
        bytes32 structHash = keccak256(abi.encode(
            _CANCEL_BET_TYPEHASH,
            betId,
            nonces[bet.proposer]++, // Increment nonce
            deadline
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(hash, signature);
        
        require(signer == bet.proposer, "Invalid signature");

        bet.status = BetStatus.Cancelled;

        // 2. Refund Proposer
        usdc.safeTransfer(bet.proposer, bet.stake);

        emit BetCancelled(betId, bet.proposer);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Direct Bet Lifecycle (Legacy / Direct Calls)
    // ─────────────────────────────────────────────────────────────────────────
    
    function createBet(
        bytes32 betId,
        uint256 stake,
        uint256 expiresAt,
        string calldata metadataHash
    ) external nonReentrant onlyRegisteredAgent(msg.sender) {
        require(bets[betId].id == bytes32(0), "Bet exists");
        require(stake > 0, "Invalid stake");
        require(expiresAt > block.timestamp, "Already expired");
        
        // Transfer stake from proposer (must approve first)
        usdc.safeTransferFrom(msg.sender, address(this), stake);
        
        bets[betId] = Bet({
            id: betId,
            proposer: msg.sender,
            counter: address(0),
            stake: stake,
            metadataHash: metadataHash,
            status: BetStatus.Open,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });
        
        emit BetCreated(betId, msg.sender, stake, metadataHash, expiresAt);
    }
    
    function matchBet(bytes32 betId) external nonReentrant onlyRegisteredAgent(msg.sender) {
        Bet storage bet = bets[betId];
        
        require(bet.id != bytes32(0), "Bet not found");
        require(bet.status == BetStatus.Open, "Bet not open");
        require(block.timestamp < bet.expiresAt, "Bet expired");
        require(msg.sender != bet.proposer, "Cannot self-match");
        
        // Transfer matching stake from counter (must approve first)
        usdc.safeTransferFrom(msg.sender, address(this), bet.stake);
        
        bet.counter = msg.sender;
        bet.status = BetStatus.Matched;
        
        emit BetMatched(betId, msg.sender);
    }
    
    function resolve(bytes32 betId, address winner) external onlyOwner nonReentrant {
        Bet storage bet = bets[betId];
        
        require(bet.id != bytes32(0), "Bet not found");
        require(bet.status == BetStatus.Matched, "Bet not matched");
        require(
            winner == bet.proposer || winner == bet.counter,
            "Invalid winner"
        );
        
        bet.status = BetStatus.Resolved;
        
        // Pay winner the full pot (both stakes)
        uint256 payout = bet.stake * 2;
        usdc.safeTransfer(winner, payout);
        
        emit BetResolved(betId, winner, payout);
    }
    
    function cancel(bytes32 betId) external nonReentrant {
        Bet storage bet = bets[betId];
        
        require(bet.id != bytes32(0), "Bet not found");
        require(bet.status == BetStatus.Open, "Bet not open");
        require(msg.sender == bet.proposer, "Only proposer can cancel");
        
        bet.status = BetStatus.Cancelled;
        
        // Refund proposer
        usdc.safeTransfer(bet.proposer, bet.stake);
        
        emit BetCancelled(betId, bet.proposer);
    }
    
    function cancelExpired(bytes32 betId) external nonReentrant {
        Bet storage bet = bets[betId];
        
        require(bet.id != bytes32(0), "Bet not found");
        require(bet.status == BetStatus.Open, "Bet not open");
        require(block.timestamp >= bet.expiresAt, "Not expired");
        
        bet.status = BetStatus.Cancelled;
        
        // Refund proposer
        usdc.safeTransfer(bet.proposer, bet.stake);
        
        emit BetCancelled(betId, bet.proposer);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────────────────────────────────
    
    function getBet(bytes32 betId) external view returns (
        address proposer,
        address counter,
        uint256 stake,
        string memory metadataHash,
        BetStatus status,
        uint256 createdAt,
        uint256 expiresAt
    ) {
        Bet storage bet = bets[betId];
        return (
            bet.proposer,
            bet.counter,
            bet.stake,
            bet.metadataHash,
            bet.status,
            bet.createdAt,
            bet.expiresAt
        );
    }
    
    function getPot(bytes32 betId) external view returns (uint256) {
        Bet storage bet = bets[betId];
        if (bet.status == BetStatus.Matched) {
            return bet.stake * 2;
        }
        return bet.stake;
    }
    
    function getNonce(address owner) external view returns (uint256) {
        return nonces[owner];
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}

interface IERC20Permit {
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
