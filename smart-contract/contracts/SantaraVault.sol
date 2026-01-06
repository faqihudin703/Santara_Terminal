// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Santara Vault (SIDR)
 * @dev Brankas untuk Santara Rupiah (Non-Upgradeable).
 * - Revenue Enabled (Fee ETH)
 * - Unique ID (Timestamp + Nonce)
 */
contract SantaraVault is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    // --- STATE ---
    IERC20 public token;
    uint256 public bridgeFee;
    uint64 public nonce;

    mapping(bytes32 => bool) public processedRelease;

    // --- EVENTS ---
    event TokensLocked(
        address indexed user, 
        uint256 amount, 
        uint256 destChainId, 
        bytes32 transferId,
        uint256 timestamp
    );
    
    event TokensReleased(address indexed to, uint256 amount, bytes32 transferId);
    event FeeUpdated(uint256 newFee);
    event FeesWithdrawn(address to, uint256 amount);

    constructor(address _token, uint256 _initialFee) {
        require(_token != address(0), "Invalid token");
        token = IERC20(_token);
        bridgeFee = _initialFee;
        nonce = 1;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RELAYER_ROLE, msg.sender);
    }

    // ====================================================
    // 1. LOCK
    // ====================================================
    function lockTokens(
        address toChainRecipient,
        uint256 amount,
        uint256 destinationChainId
    ) external payable nonReentrant {
        require(amount > 0, "Amount > 0");
        require(msg.value >= bridgeFee, "Insufficient ETH Fee");
        
        token.safeTransferFrom(msg.sender, address(this), amount);

        // --- GENERATE UNIQUE ID ---
        bytes32 transferID = keccak256(
            abi.encode(
                msg.sender, 
                toChainRecipient, 
                amount, 
                nonce, 
                block.chainid, 
                destinationChainId,
                block.timestamp
            )
        );

        // Emit Event dengan Timestamp
        emit TokensLocked(
            msg.sender, 
            amount, 
            destinationChainId, 
            transferID,
            block.timestamp
        );

        unchecked { nonce++; }
    }

    // ====================================================
    // 2. RELEASE
    // ====================================================
    function releaseTokens(
        address to,
        uint256 amount,
        bytes32 transferID
    ) external onlyRole(RELAYER_ROLE) nonReentrant {
        require(!processedRelease[transferID], "ID Already Processed");
        processedRelease[transferID] = true;

        // Kirim token dari Vault ke User
        token.safeTransfer(to, amount);

        emit TokensReleased(to, amount, transferID);
    }

    // ====================================================
    // 3. ADMIN FUNCTIONS
    // ====================================================
    function withdrawFees() external onlyRole(DEFAULT_ADMIN_ROLE) {
        payable(msg.sender).transfer(address(this).balance);
        emit FeesWithdrawn(msg.sender, address(this).balance);
    }
    
    function setFee(uint256 _newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bridgeFee = _newFee;
        emit FeeUpdated(_newFee);
    }
}