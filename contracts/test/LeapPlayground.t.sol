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

/// @dev 低风险体验版（Playground）参数专项测试：0 seed、单笔 ≤ 1 USDC、10 USDC 毕业。
contract LeapPlaygroundTest is Test {
    uint256 internal constant ONE_USDC = 1_000_000; // 1 USDC (6 decimals)

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
    address internal trader = makeAddr("trader");

    bytes32 internal vanitySalt;

    function setUp() public {
        usdc = new MockUSDC();
        btcLt = new MockLT(address(usdc), "BTC", 3 ether, true);

        address[] memory lts = new address[](1);
        lts[0] = address(btcLt);
        factory = new MockBounceFactory(lts, address(this));
        globalStorage = new MockGlobalStorage(address(factory));

        LeapConfig.Params memory cfg = LeapConfig.playground();
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

        usdc.mint(creator, 1_000e6);
        usdc.mint(trader, 1_000e6);

        vm.pauseGasMetering();
        vanitySalt = _findVanitySalt(creator, "Play Token", "PLAY");
        vm.resumeGasMetering();
    }

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

    function _params() internal view returns (ILeapTypes.LaunchParams memory) {
        return ILeapTypes.LaunchParams({
            name: "Play Token",
            ticker: "PLAY",
            description: "desc",
            image: "https://example.com/x.png",
            urls: ["https://a", "https://b", "https://c"],
            ltAddress: address(btcLt),
            salt: vanitySalt
        });
    }

    function _createZeroSeed() internal returns (address token) {
        vm.startPrank(creator);
        token = zap.createToken(_params(), 0);
        vm.stopPrank();
    }

    // --- config ---

    function test_PlaygroundConstants() public view {
        assertEq(zap.MIN_SEED_USDC(), 0);
        assertEq(zap.MIN_USDC_AMOUNT(), 100_000);
        assertEq(zap.MAX_USDC_PER_TRADE(), ONE_USDC);
        assertEq(bonding.GRADUATION_USDC(), 10_000_000);
        assertEq(bonding.VIRTUAL_USDC(), 3_000_000);
    }

    // --- 0 seed ---

    function test_CreateToken_zeroSeed_registersWithoutFunds() public {
        address token = _createZeroSeed();
        assertEq(bonding.creatorOf(token), creator);
        assertTrue(bonding.isTrading(token));
        // 未垫钱：创作者无初始持仓，曲线未募集。
        assertEq(IERC20(token).balanceOf(creator), 0);
        assertEq(bonding.raisedUsdc(token), 0);
    }

    function test_ZeroSeedToken_firstBuyInitializesCurve() public {
        address token = _createZeroSeed();

        vm.startPrank(trader);
        usdc.approve(address(zap), ONE_USDC);
        uint256 out = zap.buy(token, ONE_USDC, 0, address(0));
        vm.stopPrank();

        assertGt(out, 0);
        assertEq(IERC20(token).balanceOf(trader), out);
    }

    // --- 1 USDC cap ---

    function test_Buy_revertsAboveMaxTrade() public {
        address token = _createZeroSeed();

        vm.startPrank(trader);
        usdc.approve(address(zap), ONE_USDC + 1);
        vm.expectRevert(bytes("max buy"));
        zap.buy(token, ONE_USDC + 1, 0, address(0));
        vm.stopPrank();
    }

    function test_Create_revertsAboveMaxSeed() public {
        vm.startPrank(creator);
        usdc.approve(address(zap), ONE_USDC + 1);
        vm.expectRevert(bytes("max seed"));
        zap.createToken(_params(), ONE_USDC + 1);
        vm.stopPrank();
    }

    function test_Buy_revertsBelowMinUsdc() public {
        address token = _createZeroSeed();

        vm.startPrank(trader);
        usdc.approve(address(zap), 100_000);
        vm.expectRevert(bytes("min buy"));
        zap.buy(token, 100_000 - 1, 0, address(0));
        vm.stopPrank();
    }

    // --- 10 USDC graduation via ≤1U buys ---

    function test_Graduation_reachedWithCappedBuys() public {
        address token = _createZeroSeed();

        // 连续 1 USDC 买入直到毕业（10 USDC 阈值 → 约十来笔）。
        for (uint256 i = 0; i < 20; i++) {
            if (bonding.isGraduated(token)) break;
            vm.startPrank(trader);
            usdc.approve(address(zap), ONE_USDC);
            zap.buy(token, ONE_USDC, 0, address(0));
            vm.stopPrank();
        }

        assertTrue(bonding.isGraduated(token), "should graduate");
        assertTrue(bonding.pairOf(token) != address(0), "pair created");
    }
}
