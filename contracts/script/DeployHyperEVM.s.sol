// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {LeapToken} from "../src/LeapToken.sol";
import {LeapBonding} from "../src/LeapBonding.sol";
import {LeapBondingPlayground} from "../src/playground/LeapBondingPlayground.sol";
import {LeapRouter} from "../src/LeapRouter.sol";
import {LeapZap} from "../src/LeapZap.sol";
import {LeapCreatorRewards} from "../src/LeapCreatorRewards.sol";
import {LeapConfig} from "../src/LeapConfig.sol";

interface IBounceGlobalStorage {
    function factory() external view returns (address);
}

/// @dev HyperEVM 主网（chain 999）部署 LEAP 自有合约。
///      不部署 MockUSDC / MockLT / 本地 UniV2；复用链上 USDC 与 Bounce GlobalStorage。
///
/// 用法（在 contracts/ 下）：
///   export PRIVATE_KEY=0x...   # 部署者私钥，勿提交 git
///   forge script script/DeployHyperEVM.s.sol \
///     --rpc-url https://rpc.hyperliquid.xyz/evm \
///     --broadcast \
///     --slow
///
/// 可选 env（见 .env.deploy.example）：
///   USDC_ADDRESS、BOUNCE_GLOBAL_STORAGE、CHAIN_ID、DEPLOYMENTS_OUT
contract DeployHyperEVM is Script {
    uint256 internal constant EXPECTED_CHAIN_ID = 999;

    // HyperEVM official USDC (matches web/lib/contracts/config.ts)
    address internal constant DEFAULT_USDC = 0xb88339CB7199b77E23DB6E890353E22632Ba630f;
    // 自 Alt Fun Bonding.bounceGlobalStorage() 读取（2026-06）；可用 env 覆盖
    address internal constant DEFAULT_BOUNCE_GLOBAL_STORAGE =
        0xa07d06383c1863c8A54d427aC890643d76cc03ff;

    // 与 LeapZap.protocolTreasury 一致，仅用于部署日志
    address internal constant PROTOCOL_TREASURY = 0x5945509FD601fB6b67bE2ff06ee72188057d45F3;

    LeapToken internal tokenImpl;
    LeapBonding internal bonding;
    LeapCreatorRewards internal rewards;
    LeapRouter internal router;
    LeapZap internal zap;

    address internal usdc;
    address internal bounceGlobalStorage;
    address internal bounceFactory;

    function run() external {
        usdc = vm.envOr("USDC_ADDRESS", DEFAULT_USDC);
        bounceGlobalStorage = vm.envOr("BOUNCE_GLOBAL_STORAGE", DEFAULT_BOUNCE_GLOBAL_STORAGE);

        uint256 expectedChainId = vm.envOr("CHAIN_ID", EXPECTED_CHAIN_ID);
        require(block.chainid == expectedChainId, "unexpected chainId");

        bounceFactory = _preflight(usdc, bounceGlobalStorage);

        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        _deploy();
        vm.stopBroadcast();

        _writeJson();
        _logEnv();
    }

    function _preflight(address usdc_, address globalStorage_) internal view returns (address factory_) {
        require(usdc_ != address(0), "zero usdc");
        require(globalStorage_ != address(0), "zero globalStorage");

        string memory symbol = IERC20Metadata(usdc_).symbol();
        uint8 decimals = IERC20Metadata(usdc_).decimals();
        require(decimals == 6, "usdc decimals");
        require(
            keccak256(bytes(symbol)) == keccak256(bytes("USDC"))
                || keccak256(bytes(symbol)) == keccak256(bytes("USDC.e")),
            "usdc symbol"
        );

        factory_ = IBounceGlobalStorage(globalStorage_).factory();
        require(factory_ != address(0), "bounce factory");

        console2.log("Preflight OK");
        console2.log("  chainId:", block.chainid);
        console2.log("  usdc:", usdc_);
        console2.log("  bounceGlobalStorage:", globalStorage_);
        console2.log("  bounceFactory:", factory_);
        console2.log("  protocolTreasury (Zap):", PROTOCOL_TREASURY);
    }

    function _deploy() internal {
        // PROTOCOL_PROFILE=playground（默认，低风险体验版）| production
        bool isPlayground = _isPlayground();
        LeapConfig.Params memory cfg = isPlayground ? LeapConfig.playground() : LeapConfig.production();

        tokenImpl = new LeapToken();
        // 体验版部署带「收尾赎回」的 LeapBondingPlayground；正式版用 LeapBonding，逻辑不受影响。
        if (isPlayground) {
            bonding = new LeapBondingPlayground(
                usdc, address(tokenImpl), bounceGlobalStorage, cfg.virtualUsdc, cfg.virtualToken, cfg.graduationUsdc
            );
        } else {
            bonding = new LeapBonding(
                usdc, address(tokenImpl), bounceGlobalStorage, cfg.virtualUsdc, cfg.virtualToken, cfg.graduationUsdc
            );
        }
        rewards = new LeapCreatorRewards(usdc);
        router = new LeapRouter(address(bonding));
        zap = new LeapZap(
            usdc, address(bonding), address(rewards), cfg.minSeedUsdc, cfg.minUsdcAmount, cfg.maxUsdcPerTrade
        );

        bonding.setZap(address(zap));
        bonding.setRouter(address(router));
        rewards.setZap(address(zap));
    }

    function _isPlayground() internal view returns (bool) {
        string memory name = vm.envOr("PROTOCOL_PROFILE", string("playground"));
        if (keccak256(bytes(name)) == keccak256(bytes("production"))) {
            console2.log("Protocol profile: production (LeapBonding)");
            return false;
        }
        console2.log("Protocol profile: playground (LeapBondingPlayground)");
        return true;
    }

    function _writeJson() internal {
        string memory out = vm.envOr("DEPLOYMENTS_OUT", string("./deployments/hyperevm.json"));
        string memory obj = "leap-hyperevm";

        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeString(obj, "rpcUrl", "https://rpc.hyperliquid.xyz/evm");
        vm.serializeAddress(obj, "usdc", usdc);
        vm.serializeAddress(obj, "bounceGlobalStorage", bounceGlobalStorage);
        vm.serializeAddress(obj, "bounceFactory", bounceFactory);
        vm.serializeAddress(obj, "zap", address(zap));
        vm.serializeAddress(obj, "bonding", address(bonding));
        vm.serializeAddress(obj, "router", address(router));
        vm.serializeAddress(obj, "creatorRewards", address(rewards));
        string memory output = vm.serializeAddress(obj, "tokenImplementation", address(tokenImpl));

        vm.writeJson(output, out);
        console2.log("Wrote %s", out);
    }

    function _logEnv() internal view {
        console2.log("");
        console2.log("=== web/.env.production (LEAP contracts, replace after deploy) ===");
        console2.log("NEXT_PUBLIC_EVM_CHAIN_ID=999");
        console2.log("NEXT_PUBLIC_EVM_RPC_URL=https://rpc.hyperliquid.xyz/evm");
        console2.log("NEXT_PUBLIC_EVM_EXPLORER_URL=https://hyperevmscan.io");
        console2.log("NEXT_PUBLIC_ZAP_ADDRESS=%s", address(zap));
        console2.log("NEXT_PUBLIC_BONDING_ADDRESS=%s", address(bonding));
        console2.log("NEXT_PUBLIC_ROUTER_ADDRESS=%s", address(router));
        console2.log("NEXT_PUBLIC_USDC_ADDRESS=%s", usdc);
        console2.log("NEXT_PUBLIC_CREATOR_REWARDS_ADDRESS=%s", address(rewards));
        console2.log("");
        console2.log("=== backend/.env (LEAP contracts) ===");
        console2.log("CHAIN_RPC_URL=https://rpc.hyperliquid.xyz/evm");
        console2.log("CHAIN_ID=999");
        console2.log("INDEXER_ENABLED=true");
        console2.log("ZAP_ADDRESS=%s", address(zap));
        console2.log("ZAP_ADDRESSES=%s", address(zap));
        console2.log("BONDING_ADDRESS=%s", address(bonding));
        console2.log("ROUTER_ADDRESS=%s", address(router));
        console2.log("USDC_ADDRESS=%s", usdc);
        console2.log("");
        console2.log("Verify bonding wiring:");
        console2.log("  cast call %s \"bounceGlobalStorage()(address)\"", address(bonding));
        console2.log("  cast call %s \"zap()(address)\"", address(bonding));
    }
}
