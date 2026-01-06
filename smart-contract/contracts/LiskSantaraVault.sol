// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

contract LiskSantaraVault is Initializable, ReentrancyGuardUpgradeable, AccessControlUpgradeable, PausableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    // --- STATE VARIABLES ---
    IERC20Upgradeable public token; // Token SAN

    // Roles
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    mapping(bytes32 => bool) public processedRelease;
    
    uint64 public nonce; 

    // --- EVENTS ---
    event TokensLocked(
        address indexed user,
        address indexed toChainRecipient,
        uint256 amount,
        uint64 nonce,
        uint256 destinationChainId,
        bytes32 transferID
    );

    event TokensReleased(
        address indexed to,
        uint256 amount,
        bytes32 transferID
    );

    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // --- INITIALIZER ---
    function initialize(IERC20Upgradeable _token) external initializer {
        __ReentrancyGuard_init();
        __AccessControl_init();
        __Pausable_init();

        require(address(_token) != address(0), "Zero token address");
        token = _token;

        // Setup Roles (Deployer jadi Admin & Relayer awal)
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RELAYER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);

        nonce = 1;
    }

    // --- MAIN FEATURES ---
    
    function lockTokens(
        address toChainRecipient,
        uint256 amount,
        uint256 destinationChainId
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(toChainRecipient != address(0), "Invalid recipient");
        
        token.safeTransferFrom(msg.sender, address(this), amount);
        
        bytes32 transferID = keccak256(
            abi.encode(
                msg.sender,
                toChainRecipient,
                amount,
                nonce,
                block.chainid,
                destinationChainId
            )
        );
        
        emit TokensLocked(
            msg.sender,
            toChainRecipient,
            amount,
            nonce,
            destinationChainId,
            transferID
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
        
        // V2 SECURITY: Cek apakah ID ini sudah pernah diproses?
        require(!processedRelease[transferID], "Transfer ID already processed");

        // Tandai sebagai sudah diproses
        processedRelease[transferID] = true;

        // Transfer token dari Vault ke User
        token.safeTransfer(to, amount);

        emit TokensReleased(to, amount, transferID);
    }

    // --- ADMIN FUNCTIONS ---

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
}