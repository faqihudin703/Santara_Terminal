// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/MathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

/**
 * @title SantaraDEX
 * @dev Simple AMM DEX (ETH <-> SAN Token)
 * - Upgradeable (Transparent Proxy)
 * - Fees enabled (Revenue Model)
 * - LP Tokens (SLP)
 */
contract SantaraDEX is
    Initializable,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using AddressUpgradeable for address;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IERC20Upgradeable public token; // Santara Token (SAN)
    
    // Fee Config (Standard 0.3% = 3 / 1000)
    uint256 public feeNumerator;    
    uint256 public feeDenominator;  

    uint256 public constant MAX_FEE_NUMERATOR = 50; // Max fee 5%
    uint256 public constant MINIMUM_LIQUIDITY = 1000; // Burned on first mint

    // Events
    event LiquidityAdded(address indexed provider, uint256 ethAmount, uint256 tokenAmount, uint256 lpMinted);
    event LiquidityRemoved(address indexed provider, uint256 ethAmount, uint256 tokenAmount, uint256 lpBurned);
    event Swapped(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FeeUpdated(uint256 newNumerator, uint256 newDenominator);
    event RescueERC20(address indexed token, address indexed to, uint256 amount);
    event RescueETH(address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // -------- INITIALIZER --------
    function initialize(
        address _token,
        address admin,
        uint256 _feeNumerator,
        uint256 _feeDenominator
    ) external initializer
    {
        require(_token != address(0), "invalid token");
        require(admin != address(0), "invalid admin");
        require(_feeDenominator > 0, "invalid denom");
        require(_feeNumerator <= MAX_FEE_NUMERATOR, "fee too high");

        // Contract check
        require(_token.isContract(), "token not contract");

        // Nama LP Token: Santara LP Token (SLP)
        __ERC20_init("Santara LP Token", "SLP");
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        token = IERC20Upgradeable(_token);
        feeNumerator = _feeNumerator;
        feeDenominator = _feeDenominator;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }
    
    // -------- VIEWS --------

    function getReserves() public view returns (uint256 tokenReserve, uint256 ethReserve) {
        tokenReserve = token.balanceOf(address(this));
        ethReserve = address(this).balance;
    }

    // AMM Math with Fees
    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal view returns (uint256) {
        require(amountIn > 0, "insufficient in");
        require(reserveIn > 0 && reserveOut > 0, "insufficient liquidity");

        uint256 amountInWithFee = amountIn * (feeDenominator - feeNumerator);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * feeDenominator) + amountInWithFee;
        
        return numerator / denominator;
    }

    // -------- LIQUIDITY FUNCTIONS --------

    function addLiquidity(uint256 _tokenDesired)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (uint256 lpMinted)
    {
        uint256 ethAmount = msg.value;
        require(ethAmount > 0 && _tokenDesired > 0, "need ETH + token");

        uint256 lpSupply = totalSupply();
        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 ethReserve = address(this).balance - ethAmount; // Exclude msg.value

        uint256 tokenAmount;
        
        if (lpSupply == 0) {
            // Initial Liquidity
            tokenAmount = _tokenDesired;
            uint256 root = MathUpgradeable.sqrt(ethAmount * tokenAmount);
            require(root > MINIMUM_LIQUIDITY, "insufficient initial liquidity");
            lpMinted = root - MINIMUM_LIQUIDITY;
            // Burn minimum liquidity permanently
            _mint(address(0xdEaD), MINIMUM_LIQUIDITY); 
        } else {
            // Subsequent Liquidity (Must match ratio)
            tokenAmount = (ethAmount * tokenReserve) / ethReserve;
            require(tokenAmount <= _tokenDesired, "slippage: token amount too high");
            lpMinted = (ethAmount * lpSupply) / ethReserve;
        }

        require(lpMinted > 0, "insufficient LP minted");

        token.safeTransferFrom(msg.sender, address(this), tokenAmount);
        _mint(msg.sender, lpMinted);

        emit LiquidityAdded(msg.sender, ethAmount, tokenAmount, lpMinted);
    }

    function removeLiquidity(uint256 lpAmount, uint256 minEthOut, uint256 minTokenOut)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 ethOut, uint256 tokenOut)
    {
        require(lpAmount > 0, "zero amount");
        uint256 lpSupply = totalSupply();
        
        uint256 ethReserve = address(this).balance;
        uint256 tokenReserve = token.balanceOf(address(this));

        ethOut = (lpAmount * ethReserve) / lpSupply;
        tokenOut = (lpAmount * tokenReserve) / lpSupply;

        require(ethOut >= minEthOut, "slippage: eth too low");
        require(tokenOut >= minTokenOut, "slippage: token too low");

        _burn(msg.sender, lpAmount);

        token.safeTransfer(msg.sender, tokenOut);
        (bool ok, ) = payable(msg.sender).call{ value: ethOut }("");
        require(ok, "ETH transfer failed");

        emit LiquidityRemoved(msg.sender, ethOut, tokenOut, lpAmount);
    }

    // -------- SWAP FUNCTIONS --------

    // Swap ETH -> SAN
    function swapEthToToken(uint256 minTokenOut)
        external
        payable
        whenNotPaused
        nonReentrant
        returns (uint256 tokenOut)
    {
        uint256 ethIn = msg.value;
        require(ethIn > 0, "zero eth");

        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 ethReserve = address(this).balance - ethIn;

        tokenOut = _getAmountOut(ethIn, ethReserve, tokenReserve);
        require(tokenOut >= minTokenOut, "slippage: output too low");

        token.safeTransfer(msg.sender, tokenOut);

        emit Swapped(msg.sender, address(0), address(token), ethIn, tokenOut);
    }

    // Swap SAN -> ETH
    function swapTokenToEth(uint256 tokenIn, uint256 minEthOut)
        external
        whenNotPaused
        nonReentrant
        returns (uint256 ethOut)
    {
        require(tokenIn > 0, "zero token");

        uint256 tokenReserve = token.balanceOf(address(this));
        uint256 ethReserve = address(this).balance;

        ethOut = _getAmountOut(tokenIn, tokenReserve, ethReserve);
        require(ethOut >= minEthOut, "slippage: output too low");

        token.safeTransferFrom(msg.sender, address(this), tokenIn);
        
        (bool ok, ) = payable(msg.sender).call{ value: ethOut }("");
        require(ok, "ETH transfer failed");

        emit Swapped(msg.sender, address(token), address(0), tokenIn, ethOut);
    }

    // -------- ADMIN --------

    function setFee(uint256 _num, uint256 _den) external onlyRole(ADMIN_ROLE) {
        require(_den > 0 && _num <= MAX_FEE_NUMERATOR, "invalid fee");
        feeNumerator = _num;
        feeDenominator = _den;
        emit FeeUpdated(_num, _den);
    }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function rescueERC20(address erc20, address to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(erc20 != address(this) && erc20 != address(token), "cannot rescue pool assets");
        IERC20Upgradeable(erc20).safeTransfer(to, amount);
        emit RescueERC20(erc20, to, amount);
    }

    receive() external payable {}

    uint256[45] private __gap;
}