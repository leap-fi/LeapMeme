// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {ILeapTypes} from "../src/interfaces/ILeapTypes.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {MockLT} from "../src/mocks/MockLT.sol";
import {MockLtFactory} from "../src/mocks/MockLtFactory.sol";
import {MockGlobalStorage} from "../src/mocks/MockGlobalStorage.sol";
import {LeapToken} from "../src/LeapToken.sol";
import {LeapBonding} from "../src/LeapBonding.sol";
import {LeapRouter} from "../src/LeapRouter.sol";
import {LeapZap} from "../src/LeapZap.sol";
import {LeapCreatorRewards} from "../src/LeapCreatorRewards.sol";

contract LeapProtocolTest is Test {
    uint256 internal constant SEED_USDC = 20_000_000; // 20 USDC
    uint256 internal constant BUY_USDC = 50_000_000; // 50 USDC

    MockUSDC internal usdc;
    LeapToken internal tokenImpl;
    MockLT internal btcLt;
    MockGlobalStorage internal globalStorage;
    MockLtFactory internal ltFactory;
    LeapBonding internal bonding;
    LeapRouter internal router;
    LeapZap internal zap;
    LeapCreatorRewards internal rewards;

    address internal creator = makeAddr("creator");
    address internal trader = makeAddr("trader");

    bytes32 internal vanitySalt;

    function setUp() public {
        usdc = new MockUSDC();
        btcLt = new MockLT("BTC", 3 ether, true);

        address[] memory lts = new address[](1);
        lts[0] = address(btcLt);
        ltFactory = new MockLtFactory(lts);
        globalStorage = new MockGlobalStorage(address(ltFactory));

        tokenImpl = new LeapToken();
        bonding = new LeapBonding(address(usdc), address(tokenImpl), address(globalStorage));
        router = new LeapRouter(address(bonding));
        zap = new LeapZap(address(usdc), address(bonding));
        bonding.setZap(address(zap));
        bonding.setRouter(address(router));
        rewards = new LeapCreatorRewards();

        usdc.mint(creator, 1_000_000e6);
        usdc.mint(trader, 1_000_000e6);

        vm.pauseGasMetering();
        vanitySalt = _findVanitySalt(creator, "Test Token", "TEST");
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

    function _launchParams(bytes32 salt) internal view returns (ILeapTypes.LaunchParams memory) {
        return ILeapTypes.LaunchParams({
            name: "Test Token",
            ticker: "TEST",
            description: "desc",
            image: "https://example.com/x.png",
            urls: ["https://a", "https://b", "https://c"],
            ltAddress: address(btcLt),
            salt: salt
        });
    }

    function _createTokenAs(address who) internal returns (address token) {
        ILeapTypes.LaunchParams memory params = _launchParams(vanitySalt);

        vm.startPrank(who);
        usdc.approve(address(zap), SEED_USDC);
        token = zap.createToken(params, SEED_USDC);
        vm.stopPrank();
    }

    // --- create ---

    function test_CreateToken_mintsToCreatorAndEmitsEvent() public {
        ILeapTypes.LaunchParams memory params = _launchParams(vanitySalt);

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
        ILeapTypes.LaunchParams memory params = _launchParams(vanitySalt);

        vm.startPrank(creator);
        usdc.approve(address(zap), SEED_USDC);
        vm.expectRevert(bytes("seed"));
        zap.createToken(params, SEED_USDC - 1);
        vm.stopPrank();
    }

    // --- buy / sell ---

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

    // --- router quotes ---

    function test_Router_previewBuy_matchesBuy() public {
        address token = _createTokenAs(creator);
        uint256 netUsdc = BUY_USDC - (BUY_USDC * zap.buyFeeBps()) / 10_000;
        uint256 ltIn = btcLt.baseToLtAmount(netUsdc);

        (, uint256 quoted) = router.previewBuy(token, ltIn);

        vm.startPrank(trader);
        usdc.approve(address(zap), BUY_USDC);
        uint256 actual = zap.buy(token, BUY_USDC, 0, address(0));
        vm.stopPrank();

        assertEq(quoted, actual);
    }

    // --- bonding ---

    function test_TransferCreator() public {
        address token = _createTokenAs(creator);
        address newCreator = makeAddr("newCreator");

        vm.prank(creator);
        bonding.transferCreator(token, newCreator);

        assertEq(bonding.creatorOf(token), newCreator);
    }

    function test_LtFactory_listsMockLt() public {
        address[] memory listed = ltFactory.lts();
        assertEq(listed.length, 1);
        assertEq(listed[0], address(btcLt));
        assertEq(globalStorage.factory(), address(ltFactory));
        assertEq(bonding.bounceGlobalStorage(), address(globalStorage));
    }

    // --- creator rewards stub ---

    function test_CreatorRewards_returnsZero() public {
        assertEq(rewards.creatorBalance(creator), 0);
        assertEq(rewards.lifetimeCreatorEarned(creator), 0);
        rewards.claim();
    }

    // --- zap constants ---

    function test_Zap_feeAndMinConstants() public view {
        assertEq(zap.MIN_SEED_USDC(), 20_000_000);
        assertEq(zap.MIN_USDC_AMOUNT(), 10_000_000);
        assertEq(zap.buyFeeBps(), 100);
        assertEq(zap.sellFeeBps(), 100);
    }
}
