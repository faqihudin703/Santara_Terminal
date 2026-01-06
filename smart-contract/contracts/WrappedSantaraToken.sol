// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract WrappedSantaraTokenold is Initializable, ERC20Upgradeable, AccessControlUpgradeable, PausableUpgradeable {
    
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    mapping(bytes32 => bool) public processed; 
    
    event BridgeMinted(address indexed to, uint256 amount, bytes32 indexed transferId);
    event BridgeBurned(address indexed from, uint256 amount, uint256 destinationChainId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        string calldata name_,
        string calldata symbol_,
        address admin
    ) external initializer {
        __ERC20_init(name_, symbol_);
        __AccessControl_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RELAYER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }
    
    function mintWrapped(
        address to, 
        uint256 amount, 
        bytes32 transferId
    )
        external
        onlyRole(RELAYER_ROLE)
        whenNotPaused
    {
        require(to != address(0), "Zero address");
        require(amount > 0, "Zero amount");
        require(!processed[transferId], "Transfer ID already processed");
        
        processed[transferId] = true;

        _mint(to, amount);
        emit BridgeMinted(to, amount, transferId);
    }
    
    function burnForBridge(uint256 amount, uint256 destinationChainId) external whenNotPaused {
        require(amount > 0, "Zero amount");
        
        _burn(msg.sender, amount);
        
        // Event ini akan ditangkap Relayer untuk unlock aset di Lisk
        emit BridgeBurned(msg.sender, amount, destinationChainId);
    }

    function pause() external onlyRole(PAUSER_ROLE) { 
        _pause(); 
    }

    function unpause() external onlyRole(PAUSER_ROLE) { 
        _unpause(); 
    }

    // Storage gap for future upgrades
    uint256[50] private __gap;
}