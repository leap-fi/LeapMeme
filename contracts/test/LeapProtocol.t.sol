// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ILeapTypes} from "../src/interfaces/ILeapTypes.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockLT} from "../src/mocks/MockLT.sol";
import {MockBounceFactory} from "../src/mocks/MockBounceFactory.sol";
import {MockGlobalStorage} from "../src/mocks/MockGlobalStorage.sol";
import {LeapToken} from "../src/LeapToken.sol";
import {LeapBonding} from "../src/LeapBonding.sol";
import {LeapRouter} from "../src/LeapRouter.sol";
import {LeapZap} from "../src/LeapZap.sol";
import {LeapCreatorRewards} from "../src/LeapCreatorRewards.sol";
import {LeapConfig} from "../src/LeapConfig.sol";
import {IUniswapV2Pair} from "../src/external/univ2/IUniswapV2.sol";

contract LeapProtocolTest is Test {
    uint256 internal constant SEED_USDC = 20_000_000; // 20 USDC
    uint256 internal constant BUY_USDC = 50_000_000; // 50 USDC
    uint256 internal constant GRAD_BUY_USDC = 2_000_000_000; // 2000 USDC -> 触发毕业

    bytes32 internal constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    MockUSDC internal usdc;
    LeapToken internal tokenImpl;
    MockLT internal btcLt;
    MockGlobalStorage internal globalStorage;
    MockBounceFactory internal factory;
    LeapBonding internal bonding;
    LeapRouter internal router;
    LeapZap internal zap;
    LeapCreatorRewards internal rewards;

    address internal creator = makeAddr("creator");
    address internal trader;
    uint256 internal traderPk;

    bytes32 internal vanitySalt;

    function setUp() public {
        (trader, traderPk) = makeAddrAndKey("trader");

        usdc = new MockUSDC();
        btcLt = new MockLT(address(usdc), "BTC", 3 ether, true);

        address[] memory lts = new address[](1);
        lts[0] = address(btcLt);
        factory = new MockBounceFactory(lts, address(this));
        globalStorage = new MockGlobalStorage(address(factory));

        // 本套用例覆盖大额买卖/毕业行为，使用 production 参数（20 seed / 1000 毕业 / 不封顶）。
        LeapConfig.Params memory cfg = LeapConfig.production();
        tokenImpl = new LeapToken();
        bonding = new LeapBonding(
            address(usdc),
            address(tokenImpl),
            address(globalStorage),
            cfg.virtualUsdc,
            cfg.virtualToken,
            cfg.graduationUsdc
        );
        rewards = new LeapCreatorRewards(address(usdc));
        router = new LeapRouter(address(bonding));
        zap = new LeapZap(
            address(usdc), address(bonding), address(rewards), cfg.minSeedUsdc, cfg.minUsdcAmount, cfg.maxUsdcPerTrade
        );

        bonding.setZap(address(zap));
        bonding.setRouter(address(router));
        rewards.setZap(address(zap));

        usdc.mint(creator, 1_000_000e6);
        usdc.mint(trader, 1_000_000e6);

        vm.pauseGasMetering();
        vanitySalt = _findVanitySalt(creator, "Test Token", "TEST");
        vm.resumeGasMetering();
    }

    // --- helpers ---

    function _findVanitySalt(address who, string memory name, string memory ticker)
        internal
        view
        returns (bytes32)
    {
        for (uint256 i = 0; i < 10_000_000; i++) {
            bytes32 salt = bytes32(i);
            address predicted = bonding.predictTokenAddress(who, name, ticker, salt);
            if (bonding.isVanity(predicted)) return salt;
        }
        revert("vanity salt not found");
    }

    function _launchParams(string memory name, string memory ticker, bytes32 salt)
        internal
        view
        returns (ILeapTypes.LaunchParams memory)
    {
        return ILeapTypes.LaunchParams({
            name: name,
            ticker: ticker,
            description: "desc",
            image: "https://example.com/x.png",
            urls: ["https://a", "https://b", "https://c"],
            ltAddress: address(btcLt),
            salt: salt
        });
    }

    function _createTokenAs(address who) internal returns (address token) {
        ILeapTypes.LaunchParams memory params = _launchParams("Test Token", "TEST", vanitySalt);
        vm.startPrank(who);
        usdc.approve(address(zap), SEED_USDC);
        token = zap.createToken(params, SEED_USDC);
        vm.stopPrank();
    }

    function _buyAs(address who, address token, uint256 usdcAmount) internal returns (uint256 out) {
        vm.startPrank(who);
        usdc.approve(address(zap), usdcAmount);
        out = zap.buy(token, usdcAmount, 0, address(0));
        vm.stopPrank();
    }

    function _graduate(address token) internal {
        _buyAs(trader, token, GRAD_BUY_USDC);
        assertTrue(bonding.isGraduated(token), "should be graduated");
    }

    // --- create ---

    function test_CreateToken_mintsToCreatorAndEmitsEvent() public {
        ILeapTypes.LaunchParams memory params = _launchParams("Test Token", "TEST", vanitySalt);

        vm.startPrank(creator);
        usdc.approve(address(zap), SEED_USDC);
        address token = zap.createToken(params, SEED_USDC);
        vm.stopPrank();

        assertTrue(bonding.isVanity(token));
        assertEq(bonding.creatorOf(token), creator);
        assertEq(bonding.ltOf(token), address(btcLt));
        assertTrue(bonding.isTrading(token));
        assertFalse(bonding.isGraduated(token));
        assertGt(IERC20(token).balanceOf(creator), 0);
        assertEq(btcLt.targetAsset(), "BTC");
        assertEq(btcLt.targetLeverage(), 3 ether);
        assertTrue(btcLt.isLong());
    }

    function test_CreateToken_revertsBelowMinSeed() public {
        ILeapTypes.LaunchParams memory params = _launchParams("Test Token", "TEST", vanitySalt);

        vm.startPrank(creator);
        usdc.approve(address(zap), SEED_USDC);
        vm.expectRevert(bytes("seed"));
        zap.createToken(params, SEED_USDC - 1);
        vm.stopPrank();
    }

    // --- buy / sell（曲线阶段）---

    function test_BuyAndSell_roundTrip() public {
        address token = _createTokenAs(creator);

        vm.startPrank(trader);
        usdc.approve(address(zap), BUY_USDC);
        uint256 tokensOut = zap.buy(token, BUY_USDC, 0, address(0));
        assertGt(tokensOut, 0);

        IERC20(token).approve(address(zap), tokensOut);
        uint256 usdcOut = zap.sell(token, tokensOut, 0);
        assertGt(usdcOut, 0);
        vm.stopPrank();
    }

    function test_Buy_revertsBelowMinUsdc() public {
        address token = _createTokenAs(creator);

        vm.startPrank(trader);
        usdc.approve(address(zap), 10_000_000);
        vm.expectRevert(bytes("min buy"));
        zap.buy(token, 10_000_000 - 1, 0, address(0));
        vm.stopPrank();
    }

    function test_Router_previewBuy_matchesBuy() public {
        address token = _createTokenAs(creator);
        uint256 netUsdc = BUY_USDC - (BUY_USDC * zap.buyFeeBps()) / 10_000;
        uint256 ltIn = btcLt.baseToLtAmount(netUsdc);

        (, uint256 quoted) = router.previewBuy(token, ltIn);

        uint256 actual = _buyAs(trader, token, BUY_USDC);
        assertEq(quoted, actual);
    }

    // --- graduation ---

    function test_Graduation_createsPairAndContinuesTrading() public {
        address token = _createTokenAs(creator);
        assertFalse(bonding.isGraduated(token));

        _graduate(token);

        address pair = bonding.pairOf(token);
        assertTrue(pair != address(0), "pair created");
        assertFalse(bonding.isTrading(token), "no longer bonding-trading");

        (uint112 r0, uint112 r1,) = IUniswapV2Pair(pair).getReserves();
        assertGt(r0, 0);
        assertGt(r1, 0);

        // 毕业后买入：走 UniV2 池。
        uint256 balBefore = IERC20(token).balanceOf(trader);
        uint256 bought = _buyAs(trader, token, BUY_USDC);
        assertGt(bought, 0);
        assertEq(IERC20(token).balanceOf(trader), balBefore + bought);

        // 毕业后卖出。
        vm.startPrank(trader);
        IERC20(token).approve(address(zap), bought);
        uint256 usdcOut = zap.sell(token, bought, 0);
        vm.stopPrank();
        assertGt(usdcOut, 0);
    }

    // --- creator rewards ---

    function test_CreatorRewards_accrueAndClaim() public {
        address token = _createTokenAs(creator);

        _buyAs(trader, token, BUY_USDC);
        uint256 totalFee = (BUY_USDC * zap.buyFeeBps()) / 10_000;
        uint256 expectedCreatorFee = (totalFee * zap.creatorFeeShareBps()) / 10_000;
        assertEq(rewards.creatorBalance(creator), expectedCreatorFee);
        assertEq(rewards.lifetimeCreatorEarned(creator), expectedCreatorFee);

        uint256 before = usdc.balanceOf(creator);
        vm.prank(creator);
        rewards.claim();
        assertEq(usdc.balanceOf(creator), before + expectedCreatorFee);
        assertEq(rewards.creatorBalance(creator), 0);
        assertEq(rewards.lifetimeCreatorEarned(creator), expectedCreatorFee);
    }

    function test_ProtocolFee_paidToTreasury() public {
        address token = _createTokenAs(creator);
        address treasury = zap.protocolTreasury();

        uint256 before = usdc.balanceOf(treasury);
        _buyAs(trader, token, BUY_USDC);

        uint256 totalFee = (BUY_USDC * zap.buyFeeBps()) / 10_000;
        uint256 expectedProtocolFee = totalFee - (totalFee * zap.creatorFeeShareBps()) / 10_000;
        assertEq(usdc.balanceOf(treasury), before + expectedProtocolFee);
    }

    function test_PostGraduation_feesStillSplit() public {
        address token = _createTokenAs(creator);
        _graduate(token);

        address treasury = zap.protocolTreasury();
        uint256 treasuryBefore = usdc.balanceOf(treasury);
        uint256 creatorRewardsBefore = rewards.creatorBalance(creator);

        _buyAs(trader, token, BUY_USDC);

        uint256 totalFee = (BUY_USDC * zap.buyFeeBps()) / 10_000;
        uint256 creatorFee = (totalFee * zap.creatorFeeShareBps()) / 10_000;
        uint256 protocolFee = totalFee - creatorFee;

        assertEq(rewards.creatorBalance(creator), creatorRewardsBefore + creatorFee);
        assertEq(usdc.balanceOf(treasury), treasuryBefore + protocolFee);
    }

    // --- permit variants ---

    function _signPermit(address tokenForPermit, uint256 ownerPk, address owner, uint256 value)
        internal
        view
        returns (LeapZap.PermitInput memory p)
    {
        uint256 nonce;
        bytes32 domainSeparator;
        if (tokenForPermit == address(usdc)) {
            nonce = usdc.nonces(owner);
            domainSeparator = usdc.DOMAIN_SEPARATOR();
        } else {
            nonce = LeapToken(tokenForPermit).nonces(owner);
            domainSeparator = LeapToken(tokenForPermit).DOMAIN_SEPARATOR();
        }
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash =
            keccak256(abi.encode(PERMIT_TYPEHASH, owner, address(zap), value, nonce, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);
        p = LeapZap.PermitInput({value: value, deadline: deadline, v: v, r: r, s: s});
    }

    function test_BuyWithPermit() public {
        address token = _createTokenAs(creator);

        LeapZap.PermitInput memory p = _signPermit(address(usdc), traderPk, trader, BUY_USDC);
        vm.prank(trader);
        uint256 out = zap.buyWithPermit(token, BUY_USDC, 0, address(0), p);
        assertGt(out, 0);
        assertEq(IERC20(token).balanceOf(trader), out);
    }

    function test_SellWithPermit() public {
        address token = _createTokenAs(creator);
        uint256 bought = _buyAs(trader, token, BUY_USDC);

        LeapZap.PermitInput memory p = _signPermit(token, traderPk, trader, bought);
        uint256 before = usdc.balanceOf(trader);
        vm.prank(trader);
        uint256 usdcOut = zap.sellWithPermit(token, bought, 0, p);
        assertGt(usdcOut, 0);
        assertEq(usdc.balanceOf(trader), before + usdcOut);
    }

    function test_CreateTokenWithPermit() public {
        (address pCreator, uint256 pPk) = makeAddrAndKey("permitCreator");
        usdc.mint(pCreator, 1_000e6);

        vm.pauseGasMetering();
        bytes32 salt = _findVanitySalt(pCreator, "Permit Token", "PMT");
        vm.resumeGasMetering();

        ILeapTypes.LaunchParams memory params = _launchParams("Permit Token", "PMT", salt);
        LeapZap.PermitInput memory p = _signPermit(address(usdc), pPk, pCreator, SEED_USDC);

        vm.prank(pCreator);
        address token = zap.createTokenWithPermit(params, SEED_USDC, p);

        assertEq(bonding.creatorOf(token), pCreator);
        assertGt(IERC20(token).balanceOf(pCreator), 0);
    }

    // --- factory / lt ---

    function test_Factory_listsLtAndPair() public view {
        address[] memory listed = factory.lts();
        assertEq(listed.length, 1);
        assertEq(listed[0], address(btcLt));
        assertEq(globalStorage.factory(), address(factory));
        assertEq(bonding.bounceGlobalStorage(), address(globalStorage));
    }

    // --- zap constants ---

    function test_Zap_feeAndMinConstants() public view {
        assertEq(zap.MIN_SEED_USDC(), 20_000_000);
        assertEq(zap.MIN_USDC_AMOUNT(), 10_000_000);
        assertEq(zap.buyFeeBps(), 75);
        assertEq(zap.sellFeeBps(), 75);
        assertEq(zap.creatorFeeShareBps(), 6667);
        assertEq(zap.protocolTreasury(), 0x5945509FD601fB6b67bE2ff06ee72188057d45F3);
        assertEq(zap.MAX_USDC_PER_TRADE(), type(uint256).max);
        assertEq(bonding.GRADUATION_USDC(), 1_000_000_000);
        assertEq(bonding.VIRTUAL_USDC(), 3_000_000_000);
    }
}
