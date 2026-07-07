// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ILeapTypes} from "./interfaces/ILeapTypes.sol";
import {LeapToken} from "./LeapToken.sol";
import {IUniswapV2Factory, IUniswapV2Pair} from "./external/univ2/IUniswapV2.sol";

interface IMockLT {
    function deposit(uint256 usdcAmount) external returns (uint256 ltOut);
    function redeem(uint256 ltAmount) external returns (uint256 usdcOut);
}

interface IBounceGlobalStorage {
    function factory() external view returns (address);
}

/// @dev 发币工厂 + bonding 曲线 + 毕业迁移到 UniV2。
///      生命周期：
///        1. createToken/buy/sell 走常数乘积曲线（带虚拟储备）。
///        2. 累计真实 USDC（raisedUsdc）达到 GRADUATION_USDC 时，在该笔买入内原子毕业：
///           把曲线募集的 USDC 1:1 换成 LT，与新铸 meme 一起注入 UniV2 池，LP 永久锁定。
///        3. 毕业后买卖改走 UniV2 池（USDC↔LT↔meme），价格在毕业点连续。
contract LeapBonding is ILeapTypes, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant VANITY_MASK = (1 << 20) - 1;

    /// @dev 曲线虚拟储备（部署时注入，见 LeapConfig）。VIRTUAL_TOKEN 为 18 位小数。
    uint256 public immutable VIRTUAL_USDC;
    uint256 public immutable VIRTUAL_TOKEN;

    /// @dev 毕业阈值（真实募集 USDC，6 位小数）。与后端 BondingCurveGraduationTargetUSD 对齐。
    uint256 public immutable GRADUATION_USDC;

    IERC20 public immutable usdc;
    address public immutable tokenImplementation;
    address public bounceGlobalStorage;

    address public zap;
    address public router;

    mapping(address => address) public ltOf;
    mapping(address => address) public creatorOf;
    mapping(address => uint256) public reserveUsdc;
    mapping(address => uint256) public reserveToken;

    mapping(address => uint256) public raisedUsdc; // 真实募集的 USDC（不含虚拟储备）
    mapping(address => bool) private _graduated;
    mapping(address => address) public pairOf;

    event CreatorTransferred(address indexed token, address indexed oldCreator, address indexed newCreator);
    event Graduated(address indexed token, address indexed pair, uint256 ltLiquidity, uint256 tokenLiquidity);

    modifier onlyZap() {
        require(msg.sender == zap, "zap");
        _;
    }

    constructor(
        address usdc_,
        address tokenImplementation_,
        address bounceGlobalStorage_,
        uint256 virtualUsdc_,
        uint256 virtualToken_,
        uint256 graduationUsdc_
    ) {
        require(virtualUsdc_ > 0 && virtualToken_ > 0, "virtual");
        require(graduationUsdc_ > 0, "graduation");
        usdc = IERC20(usdc_);
        tokenImplementation = tokenImplementation_;
        bounceGlobalStorage = bounceGlobalStorage_;
        VIRTUAL_USDC = virtualUsdc_;
        VIRTUAL_TOKEN = virtualToken_;
        GRADUATION_USDC = graduationUsdc_;
    }

    function setZap(address zap_) external {
        require(zap == address(0), "zap set");
        zap = zap_;
    }

    function setRouter(address router_) external {
        require(router == address(0), "router set");
        router = router_;
    }

    // --- salt / vanity（与前端 vanity-salt.ts 对齐）---

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

    // --- create / buy / sell（由 Zap 调用）---

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

        // seed == 0 时只登记 token（不垫钱）；曲线在首笔 buy 用虚拟储备初始化。
        if (seedUsdc > 0) {
            usdc.safeTransferFrom(msg.sender, address(this), seedUsdc);
            uint256 tokensOut = _applyBuyToCurve(token, seedUsdc);
            LeapToken(token).mint(creator, tokensOut);
            _maybeGraduate(token);
        }
    }

    function buy(address buyer, address token, uint256 usdcIn)
        external
        onlyZap
        nonReentrant
        returns (uint256 tokensOut)
    {
        usdc.safeTransferFrom(msg.sender, address(this), usdcIn);

        if (_graduated[token]) {
            tokensOut = _graduatedBuy(token, usdcIn, buyer);
        } else {
            tokensOut = _applyBuyToCurve(token, usdcIn);
            LeapToken(token).mint(buyer, tokensOut);
            _maybeGraduate(token);
        }
    }

    function sell(address, /* seller */ address token, uint256 tokenIn)
        external
        onlyZap
        nonReentrant
        returns (uint256 usdcOut)
    {
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenIn);

        if (_graduated[token]) {
            usdcOut = _graduatedSell(token, tokenIn);
        } else {
            usdcOut = _applySellToCurve(token, tokenIn);
        }
        usdc.safeTransfer(msg.sender, usdcOut);
    }

    // --- 曲线数学 ---

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
        raisedUsdc[token] += usdcIn;
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
        raisedUsdc[token] -= usdcOut;
    }

    function quoteBuy(address token, uint256 usdcIn)
        external
        view
        returns (uint256 amountInUsed, uint256 tokensOut)
    {
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

    // --- 毕业 ---

    function _maybeGraduate(address token) internal {
        if (_graduated[token]) return;
        if (raisedUsdc[token] < GRADUATION_USDC) return;
        _graduate(token);
    }

    function _graduate(address token) internal {
        _graduated[token] = true;

        uint256 realUsdc = raisedUsdc[token];
        uint256 usdcReserve = reserveUsdc[token];
        uint256 tokenReserve = reserveToken[token];

        // 保持毕业点边际价格连续：meme 注入量 = realUsdc * tokenReserve / usdcReserve。
        uint256 tokenLiquidity = (realUsdc * tokenReserve) / usdcReserve;
        require(tokenLiquidity > 0, "grad token");

        address lt = ltOf[token];

        // 募集的 USDC 1:1 兑换为 LT。
        usdc.forceApprove(lt, realUsdc);
        uint256 ltLiquidity = IMockLT(lt).deposit(realUsdc);

        // 建池并注入流动性，LP 永久锁定在本合约。
        IUniswapV2Factory factory = IUniswapV2Factory(IBounceGlobalStorage(bounceGlobalStorage).factory());
        address pair = factory.getPair(token, lt);
        if (pair == address(0)) {
            pair = factory.createPair(token, lt);
        }
        pairOf[token] = pair;

        LeapToken(token).mint(pair, tokenLiquidity);
        IERC20(lt).safeTransfer(pair, ltLiquidity);
        IUniswapV2Pair(pair).mint(address(this));

        emit Graduated(token, pair, ltLiquidity, tokenLiquidity);
    }

    function _graduatedBuy(address token, uint256 usdcIn, address buyer) internal returns (uint256 tokensOut) {
        address lt = ltOf[token];
        usdc.forceApprove(lt, usdcIn);
        uint256 ltIn = IMockLT(lt).deposit(usdcIn);

        address pair = pairOf[token];
        IERC20(lt).safeTransfer(pair, ltIn);
        tokensOut = _swap(pair, lt, token, ltIn, buyer);
    }

    function _graduatedSell(address token, uint256 tokenIn) internal returns (uint256 usdcOut) {
        address lt = ltOf[token];
        address pair = pairOf[token];

        IERC20(token).safeTransfer(pair, tokenIn);
        uint256 ltOut = _swap(pair, token, lt, tokenIn, address(this));
        usdcOut = IMockLT(lt).redeem(ltOut);
    }

    /// @dev 输入资产已转入 pair，按 UniV2 0.3% 费率算出并执行 swap。
    function _swap(address pair, address tokenIn, address tokenOut, uint256 amountIn, address to)
        internal
        returns (uint256 amountOut)
    {
        (uint112 r0, uint112 r1,) = IUniswapV2Pair(pair).getReserves();
        address t0 = IUniswapV2Pair(pair).token0();
        (uint256 reserveIn, uint256 reserveOut) =
            tokenIn == t0 ? (uint256(r0), uint256(r1)) : (uint256(r1), uint256(r0));

        amountOut = _getAmountOut(amountIn, reserveIn, reserveOut);
        (uint256 amount0Out, uint256 amount1Out) =
            tokenIn == t0 ? (uint256(0), amountOut) : (amountOut, uint256(0));
        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, to, "");
    }

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256)
    {
        require(amountIn > 0, "amount in");
        require(reserveIn > 0 && reserveOut > 0, "reserves");
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        return numerator / denominator;
    }

    // --- views / lifecycle ---

    function isTrading(address token) external view returns (bool) {
        return creatorOf[token] != address(0) && !_graduated[token];
    }

    function isGraduating(address) external pure returns (bool) {
        // 毕业在单笔交易内原子完成，不存在中间态。
        return false;
    }

    function isGraduated(address token) external view returns (bool) {
        return _graduated[token];
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
