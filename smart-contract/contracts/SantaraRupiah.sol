// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title Santara Rupiah (SIDR)
 * @dev Token Non-Upgradeable.
 * Fitur: Approve (Standard), Mint (Admin/Faucet), Burn (User).
 */
contract SantaraRupiah is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("Santara Rupiah", "SIDR") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        
        _mint(msg.sender, 1_000_000_000 * 10**decimals());
    }
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    function faucet() external {
        _mint(msg.sender, 1_000 * 10**decimals());
    }
}