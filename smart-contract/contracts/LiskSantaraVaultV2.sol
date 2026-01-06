// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer-call
contract LiskSantaraVault is Initializable, ReentrancyGuardUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    IERC20Upgradeable public token;
    
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    mapping(bytes32 => bool) public processedRelease; // Slot 1
    
    uint64 public nonce;
    
    uint256 public bridgeFee;
    
    event TokensLocked(
        address indexed user,
        address indexed toChainRecipient,
        uint256 amount,
        uint64 nonce,
        uint256 destinationChainId,
        bytes32 transferID,
        uint256 timestamp
    );

    event TokensReleased(
        address indexed to,
        uint256 amount,
        bytes32 transferID
    );

    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);
    
    event FeeUpdated(uint256 newFee);
    event FeesWithdrawn(address to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /// @custom:oz-upgrades-validate-as-initializer
    function initializeV3() external reinitializer(3) {
        // Kosong tidak masalah, hanya untuk menandai upgrade version
    }
    
    function lockTokens(
        address toChainRecipient,
        uint256 amount,
        uint256 destinationChainId
    ) external payable nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(toChainRecipient != address(0), "Invalid recipient");
        
        require(msg.value >= bridgeFee, "Insufficient Bridge Fee");
        
        token.safeTransferFrom(msg.sender, address(this), amount);
        
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
        
        emit TokensLocked(
            msg.sender,
            toChainRecipient,
            amount,
            nonce,
            destinationChainId,
            transferID,
            block.timestamp
        );

        unchecked {
            nonce++;
        }
    }
    
    function releaseTokens(
        address to,
        uint256 amount,
        bytes32 transferID
    ) external onlyRole(RELAYER_ROLE) nonReentrant whenNotPaused {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount > 0");
        
        require(!processedRelease[transferID], "Transfer ID already processed");

        processedRelease[transferID] = true;

        token.safeTransfer(to, amount);

        emit TokensReleased(to, amount, transferID);
    }
    
    function setBridgeFee(uint256 _newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bridgeFee = _newFee;
        emit FeeUpdated(_newFee);
    }
    
    function withdrawFees(address _to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        payable(_to).transfer(balance);
        emit FeesWithdrawn(_to, balance);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    function emergencyWithdraw(IERC20Upgradeable _token, address _to, uint256 _amount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _token.safeTransfer(_to, _amount);
        emit EmergencyWithdraw(address(_token), _to, _amount);
    }
    
    uint256[46] private __gap;
}