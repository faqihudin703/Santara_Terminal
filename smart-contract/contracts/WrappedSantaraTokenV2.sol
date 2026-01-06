// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @custom:oz-upgrades-unsafe-allow missing-initializer-call
contract WrappedSantaraToken is Initializable, ERC20Upgradeable, AccessControlUpgradeable, PausableUpgradeable {
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    mapping(bytes32 => bool) public processed; 
    
    uint256 public bridgeFee;
    
    uint256 private nonce;
    
    event BridgeMinted(address indexed to, uint256 amount, bytes32 indexed transferId);
    event BridgeBurned(
        address indexed from, 
        uint256 amount, 
        uint256 destinationChainId, 
        bytes32 transferId,
        uint256 timestamp
    );
    
    event FeeUpdated(uint256 newFee);
    event FeesWithdrawn(address to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /// @custom:oz-upgrades-validate-as-initializer
    function initializeV3() external reinitializer(3) {
        nonce = 1;
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
    
    function burnForBridge(uint256 amount, uint256 destinationChainId) external payable whenNotPaused {
        require(amount > 0, "Zero amount");
        require(msg.value >= bridgeFee, "Insufficient Fee");

        _burn(msg.sender, amount);
        
        bytes32 transferId = keccak256(
            abi.encode(
                msg.sender, 
                amount, 
                destinationChainId, 
                block.timestamp,
                nonce 
            )
        );
        
        emit BridgeBurned(msg.sender, amount, destinationChainId, transferId, block.timestamp);

        unchecked { nonce++; }
    }

    function setBridgeFee(uint256 _newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bridgeFee = _newFee;
        emit FeeUpdated(_newFee);
    }

    function withdrawFees(address _to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees");
        payable(_to).transfer(balance);
        emit FeesWithdrawn(_to, balance);
    }

    function pause() external onlyRole(PAUSER_ROLE) { 
        _pause(); 
    }

    function unpause() external onlyRole(PAUSER_ROLE) { 
        _unpause(); 
    }
    uint256[48] private __gap;
}