// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ILeapTypes} from "./interfaces/ILeapTypes.sol";
import {LeapToken} from "./LeapToken.sol";

contract LeapBonding is ILeapTypes, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant VANITY_MASK = (1 << 20) - 1;
    uint256 private constant VIRTUAL_USDC = 3_000_000_000; // 3000 USDC (6 decimals)
    uint256 private constant VIRTUAL_TOKEN = 1_073_000_000 ether;

    IERC20 public immutable usdc;
    address public immutable tokenImplementation;
    address public bounceGlobalStorage;

    address public zap;
    address public router;

    mapping(address => address) public ltOf;
    mapping(address => address) public creatorOf;
    mapping(address => uint256) public reserveUsdc;
    mapping(address => uint256) public reserveToken;

    event CreatorTransferred(address indexed token, address indexed oldCreator, address indexed newCreator);

    modifier onlyZap() {
        require(msg.sender == zap, "zap");
        _;
    }

    constructor(address usdc_, address tokenImplementation_, address bounceGlobalStorage_) {
        usdc = IERC20(usdc_);
        tokenImplementation = tokenImplementation_;
        bounceGlobalStorage = bounceGlobalStorage_;
    }

    function setZap(address zap_) external {
        require(zap == address(0), "zap set");
        zap = zap_;
    }

    function setRouter(address router_) external {
        require(router == address(0), "router set");
        router = router_;
    }

    function mixSalt(address creator, string memory name, string memory ticker, bytes32 userSalt)
        public
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(creator, keccak256(bytes(name)), keccak256(bytes(ticker)), userSalt));
    }

    function predictTokenAddress(address creator, string memory name, string memory ticker, bytes32 userSalt)
        public
        view
        returns (address)
    {
        bytes32 salt = mixSalt(creator, name, ticker, userSalt);
        return Clones.predictDeterministicAddress(tokenImplementation, salt, address(this));
    }

    function isVanity(address token) public pure returns (bool) {
        return (uint160(token) & VANITY_MASK) == 0;
    }

    function createToken(address creator, LaunchParams calldata params, uint256 seedUsdc)
        external
        onlyZap
        nonReentrant
        returns (address token)
    {
        bytes32 salt = mixSalt(creator, params.name, params.ticker, params.salt);
        token = Clones.cloneDeterministic(tokenImplementation, salt);
        require(isVanity(token), "vanity");

        LeapToken(token).initialize(address(this), params.name, params.ticker);

        ltOf[token] = params.ltAddress;
        creatorOf[token] = creator;

        usdc.safeTransferFrom(msg.sender, address(this), seedUsdc);

        uint256 tokensOut = _applyBuyToCurve(token, seedUsdc);
        LeapToken(token).mint(creator, tokensOut);
    }

    function buy(address buyer, address token, uint256 usdcIn) external onlyZap nonReentrant returns (uint256 tokensOut) {
        usdc.safeTransferFrom(msg.sender, address(this), usdcIn);
        tokensOut = _applyBuyToCurve(token, usdcIn);
        LeapToken(token).mint(buyer, tokensOut);
    }

    function sell(address /* seller */, address token, uint256 tokenIn)
        external
        onlyZap
        nonReentrant
        returns (uint256 usdcOut)
    {
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenIn);
        usdcOut = _applySellToCurve(token, tokenIn);
        usdc.safeTransfer(msg.sender, usdcOut);
    }

    function _applyBuyToCurve(address token, uint256 usdcIn) internal returns (uint256 tokensOut) {
        uint256 usdcReserve = reserveUsdc[token];
        uint256 tokenReserve = reserveToken[token];

        if (usdcReserve == 0 && tokenReserve == 0) {
            usdcReserve = VIRTUAL_USDC;
            tokenReserve = VIRTUAL_TOKEN;
        }

        uint256 newUsdcReserve = usdcReserve + usdcIn;
        uint256 newTokenReserve = (usdcReserve * tokenReserve) / newUsdcReserve;
        tokensOut = tokenReserve - newTokenReserve;

        reserveUsdc[token] = newUsdcReserve;
        reserveToken[token] = newTokenReserve;
    }

    function _applySellToCurve(address token, uint256 tokenIn) internal returns (uint256 usdcOut) {
        uint256 usdcReserve = reserveUsdc[token];
        uint256 tokenReserve = reserveToken[token];
        require(usdcReserve > 0 && tokenReserve > 0, "no curve");

        uint256 newTokenReserve = tokenReserve + tokenIn;
        uint256 newUsdcReserve = (usdcReserve * tokenReserve) / newTokenReserve;
        usdcOut = usdcReserve - newUsdcReserve;

        reserveUsdc[token] = newUsdcReserve;
        reserveToken[token] = newTokenReserve;
    }

    function quoteBuy(address token, uint256 usdcIn) external view returns (uint256 amountInUsed, uint256 tokensOut) {
        uint256 usdcReserve = reserveUsdc[token];
        uint256 tokenReserve = reserveToken[token];
        if (usdcReserve == 0 && tokenReserve == 0) {
            usdcReserve = VIRTUAL_USDC;
            tokenReserve = VIRTUAL_TOKEN;
        }
        amountInUsed = usdcIn;
        uint256 newUsdcReserve = usdcReserve + usdcIn;
        uint256 newTokenReserve = (usdcReserve * tokenReserve) / newUsdcReserve;
        tokensOut = tokenReserve - newTokenReserve;
    }

    function quoteSell(address token, uint256 tokenIn) external view returns (uint256 usdcOut) {
        uint256 usdcReserve = reserveUsdc[token];
        uint256 tokenReserve = reserveToken[token];
        if (usdcReserve == 0 || tokenReserve == 0) return 0;
        uint256 newTokenReserve = tokenReserve + tokenIn;
        uint256 newUsdcReserve = (usdcReserve * tokenReserve) / newTokenReserve;
        usdcOut = usdcReserve - newUsdcReserve;
    }

    function isTrading(address token) external view returns (bool) {
        return creatorOf[token] != address(0);
    }

    function isGraduating(address) external pure returns (bool) {
        return false;
    }

    function isGraduated(address) external pure returns (bool) {
        return false;
    }

    function transferCreator(address tokenAddress, address newCreator) external {
        address current = creatorOf[tokenAddress];
        require(current != address(0), "unknown");
        require(msg.sender == current, "creator");
        require(newCreator != address(0), "zero");
        creatorOf[tokenAddress] = newCreator;
        emit CreatorTransferred(tokenAddress, current, newCreator);
    }
}
