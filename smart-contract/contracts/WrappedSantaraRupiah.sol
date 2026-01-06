// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Wrapped Santara Rupiah (wSIDR)
 * @dev Token Wrapped on Destination Chain.
 * - Non-Upgradeable
 * - Revenue Enabled (Bridge Fee)
 * - Idempotency Protected
 */
contract WrappedSantaraRupiah is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    // --- STATE VARIABLES ---
    uint256 public bridgeFee;
    uint256 private nonce;
    
    mapping(bytes32 => bool) public processed; 

    // --- EVENTS ---
    // Event disesuaikan agar mudah dibaca indexernya
    event BridgeBurned(
        address indexed from, // Ganti nama parameter jadi 'from' agar standar
        uint256 amount, 
        uint256 destinationChainId, 
        bytes32 transferId,
        uint256 timestamp
    );
    
    event BridgeMinted(
        address indexed to, 
        uint256 amount, 
        bytes32 indexed transferId
    );

    event FeeUpdated(uint256 newFee);
    event FeesWithdrawn(address to, uint256 amount);

    constructor(uint256 _initialFee) ERC20("Wrapped Santara Rupiah", "wSIDR") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RELAYER_ROLE, msg.sender);

        bridgeFee = _initialFee;
        nonce = 1;
    }

    // ====================================================
    // 1. MINT (INCOMING FROM ORIGIN) - FIXED
    // ====================================================
    function mintWrapped(
        address to, 
        uint256 amount, 
        bytes32 transferId
    ) external onlyRole(RELAYER_ROLE) {
        require(!processed[transferId], "Transfer ID already processed");
        require(amount > 0, "Amount must be > 0");
        
        processed[transferId] = true;

        _mint(to, amount);
        
        emit BridgeMinted(to, amount, transferId);
    }

    // ====================================================
    // 2. BURN (OUTGOING TO ORIGIN)
    // ====================================================
    function burnForBridge(uint256 amount, uint256 destinationChainId) external payable {
        require(amount > 0, "Amount must be > 0");
        require(msg.value >= bridgeFee, "Insufficient ETH Fee");
        
        if (msg.value > bridgeFee) {
            payable(msg.sender).transfer(msg.value - bridgeFee);
        }
        
        _burn(msg.sender, amount);
        
        // Generate Unique ID
        bytes32 transferId = keccak256(
            abi.encode(
                msg.sender, 
                amount, 
                destinationChainId, 
                block.timestamp,
                nonce
            )
        );
        
        // Emit Event
        emit BridgeBurned(msg.sender, amount, destinationChainId, transferId, block.timestamp);
        
        unchecked { nonce++; }
    }

    // ====================================================
    // 3. ADMIN / REVENUE FUNCTIONS
    // ====================================================
    
    function withdrawFees() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Withdraw failed");
        
        emit FeesWithdrawn(msg.sender, balance);
    }
    
    function setBridgeFee(uint256 _newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bridgeFee = _newFee;
        emit FeeUpdated(_newFee);
    }

    receive() external payable {}
}