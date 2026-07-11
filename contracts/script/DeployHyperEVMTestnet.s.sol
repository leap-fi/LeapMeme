// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

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

/// @dev HyperEVM 测试网（chain 998）一键部署 Mock 基础设施 + LEAP 协议合约。
///      测试网暂无官方 USDC / Bounce LT，故与 DeployLocal 相同部署 Mock 栈。
///
/// 前置：部署钱包需有测试网 HYPE（gas）。领币见官方文档 Testnet faucet。
///
/// 用法（在 contracts/ 下）：
///   cp .env.deploy.testnet.example .env.deploy   # 填入 PRIVATE_KEY
///   source .env.deploy   # 或 export PRIVATE_KEY=0x...
///   forge script script/DeployHyperEVMTestnet.s.sol \
///     --rpc-url https://rpc.hyperliquid-testnet.xyz/evm \
///     --broadcast \
///     --slow
///
/// 可选 env：MINT_TO（逗号分隔地址，额外 mint MockUSDC）、DEPLOYMENTS_OUT
contract DeployHyperEVMTestnet is Script {
    uint256 internal constant EXPECTED_CHAIN_ID = 998;
    string internal constant RPC_URL = "https://rpc.hyperliquid-testnet.xyz/evm";
    string internal constant EXPLORER_URL = "https://testnet.purrsec.com";
    uint256 internal constant MINT_USDC = 1_000_000_000_000; // 1,000,000 USDC (6 decimals)

    MockUSDC internal usdc;
    MockBounceFactory internal factory;
    MockGlobalStorage internal globalStorage;
    LeapToken internal tokenImpl;
    LeapBonding internal bonding;
    LeapCreatorRewards internal rewards;
    LeapRouter internal router;
    LeapZap internal zap;
    address[] internal lts;

    function run() external {
        uint256 expectedChainId = vm.envOr("CHAIN_ID", EXPECTED_CHAIN_ID);
        require(block.chainid == expectedChainId, "unexpected chainId");

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("Deployer:", deployer);
        console2.log("Deploy block:", block.number);

        vm.startBroadcast(pk);
        _deploy();
        _mintUsdc(deployer);
        vm.stopBroadcast();

        _writeJson();
        _logEnv(deployer);
    }

    function _deploy() internal {
        usdc = new MockUSDC();

        string[2] memory assets = ["BTC", "ETH"];
        uint256[3] memory levs = [uint256(2 ether), 3 ether, 5 ether];
        for (uint256 a; a < assets.length; a++) {
            for (uint256 l; l < levs.length; l++) {
                lts.push(address(new MockLT(address(usdc), assets[a], levs[l], true)));
                lts.push(address(new MockLT(address(usdc), assets[a], levs[l], false)));
            }
        }

        factory = new MockBounceFactory(lts, msg.sender);
        globalStorage = new MockGlobalStorage(address(factory));

        LeapConfig.Params memory cfg = LeapConfig.params();
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
            address(usdc),
            address(bonding),
            address(rewards),
            cfg.minSeedUsdc,
            cfg.maxSeedUsdc,
            cfg.minUsdcAmount,
            cfg.maxUsdcPerTrade
        );

        bonding.setZap(address(zap));
        bonding.setRouter(address(router));
        rewards.setZap(address(zap));
        console2.log("Protocol params: 0 seed min, 20 USDC seed max, 1000 USDC graduation");
    }

    function _mintUsdc(address deployer) internal {
        usdc.mint(deployer, MINT_USDC);
        console2.log("Minted 1,000,000 MockUSDC to deployer");

        string memory extra = vm.envOr("MINT_TO", string(""));
        if (bytes(extra).length == 0) return;

        string[] memory parts = vm.split(extra, ",");
        for (uint256 i; i < parts.length; i++) {
            address to = vm.parseAddress(parts[i]);
            usdc.mint(to, MINT_USDC);
            console2.log("Minted 1,000,000 MockUSDC to", to);
        }
    }

    function _writeJson() internal {
        string memory out = vm.envOr("DEPLOYMENTS_OUT", string("./deployments/hyperevm-testnet.json"));
        string memory obj = "leap-hyperevm-testnet";

        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeString(obj, "rpcUrl", RPC_URL);
        vm.serializeString(obj, "explorerUrl", EXPLORER_URL);
        vm.serializeAddress(obj, "usdc", address(usdc));
        vm.serializeAddress(obj, "zap", address(zap));
        vm.serializeAddress(obj, "bonding", address(bonding));
        vm.serializeAddress(obj, "router", address(router));
        vm.serializeAddress(obj, "creatorRewards", address(rewards));
        vm.serializeAddress(obj, "globalStorage", address(globalStorage));
        vm.serializeAddress(obj, "factory", address(factory));
        vm.serializeAddress(obj, "tokenImplementation", address(tokenImpl));
        string memory output = vm.serializeAddress(obj, "lts", lts);

        vm.writeJson(output, out);
        console2.log("Wrote %s", out);
    }

    function _logEnv(address deployer) internal view {
        console2.log("");
        console2.log("=== web/.env.testnet (LEAP contracts) ===");
        console2.log("NEXT_PUBLIC_EVM_CHAIN_ID=998");
        console2.log("NEXT_PUBLIC_EVM_RPC_URL=%s", RPC_URL);
        console2.log("NEXT_PUBLIC_EVM_EXPLORER_URL=%s", EXPLORER_URL);
        console2.log("NEXT_PUBLIC_ZAP_ADDRESS=%s", address(zap));
        console2.log("NEXT_PUBLIC_BONDING_ADDRESS=%s", address(bonding));
        console2.log("NEXT_PUBLIC_ROUTER_ADDRESS=%s", address(router));
        console2.log("NEXT_PUBLIC_USDC_ADDRESS=%s", address(usdc));
        console2.log("NEXT_PUBLIC_CREATOR_REWARDS_ADDRESS=%s", address(rewards));
        console2.log("");
        console2.log("=== backend/.env.testnet (LEAP contracts) ===");
        console2.log("CHAIN_RPC_URL=%s", RPC_URL);
        console2.log("CHAIN_ID=998");
        console2.log("INDEXER_ENABLED=true");
        console2.log("INDEXER_START_BLOCK=%s", block.number);
        console2.log("INDEXER_CONFIRMATIONS=1");
        console2.log("BONDING_CURVE_GRADUATION_TARGET_USD=1000");
        console2.log("PROTOCOL_SYNC_FROM_CHAIN=true");
        console2.log("ZAP_ADDRESS=%s", address(zap));
        console2.log("ZAP_ADDRESSES=%s", address(zap));
        console2.log("BONDING_ADDRESS=%s", address(bonding));
        console2.log("ROUTER_ADDRESS=%s", address(router));
        console2.log("USDC_ADDRESS=%s", address(usdc));
        console2.log("");
        console2.log("Deployer (minted MockUSDC): %s", deployer);
        console2.log("Add wallet network: chainId 998, RPC %s", RPC_URL);
    }
}
