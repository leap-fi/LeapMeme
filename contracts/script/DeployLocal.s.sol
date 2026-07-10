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

/// @dev 本地 Anvil 一键部署：
///        forge script script/DeployLocal.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
///      默认用 Anvil 第 0 个私钥广播，并给前 5 个默认账户 mint USDC。
///      结束后写入 deployments/local.json，并打印前端/后端 env 片段。
contract DeployLocal is Script {
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
        uint256 pk = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );

        vm.startBroadcast(pk);
        _deploy();
        _mintToAnvilAccounts();
        vm.stopBroadcast();

        _writeJson();
        _logEnv();
    }

    function _deploy() internal {
        usdc = new MockUSDC();

        // 12 个 MockLT：BTC/ETH × {2,3,5}x × {LONG,SHORT}。
        string[2] memory assets = ["BTC", "ETH"];
        uint256[3] memory levs = [uint256(2 ether), 3 ether, 5 ether];
        for (uint256 a; a < assets.length; a++) {
            for (uint256 l; l < levs.length; l++) {
                lts.push(address(new MockLT(address(usdc), assets[a], levs[l], true))); // LONG
                lts.push(address(new MockLT(address(usdc), assets[a], levs[l], false))); // SHORT
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
    }

    function _mintToAnvilAccounts() internal {
        address[5] memory accounts = [
            0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
            0x90F79bf6EB2c4f870365E785982E1f101E93b906,
            0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
        ];
        for (uint256 i; i < accounts.length; i++) {
            usdc.mint(accounts[i], MINT_USDC);
        }
    }

    function _writeJson() internal {
        string memory obj = "leap-local";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeString(obj, "rpcUrl", "http://127.0.0.1:8545");
        vm.serializeAddress(obj, "usdc", address(usdc));
        vm.serializeAddress(obj, "zap", address(zap));
        vm.serializeAddress(obj, "bonding", address(bonding));
        vm.serializeAddress(obj, "router", address(router));
        vm.serializeAddress(obj, "creatorRewards", address(rewards));
        vm.serializeAddress(obj, "globalStorage", address(globalStorage));
        vm.serializeAddress(obj, "factory", address(factory));
        vm.serializeAddress(obj, "tokenImplementation", address(tokenImpl));
        string memory output = vm.serializeAddress(obj, "lts", lts);

        vm.writeJson(output, "./deployments/local.json");
        console2.log("Wrote deployments/local.json");
    }

    function _logEnv() internal view {
        console2.log("");
        console2.log("=== web/.env.development.local ===");
        console2.log("NEXT_PUBLIC_EVM_CHAIN_ID=31337");
        console2.log("NEXT_PUBLIC_EVM_RPC_URL=http://127.0.0.1:8545");
        console2.log("NEXT_PUBLIC_ZAP_ADDRESS=%s", address(zap));
        console2.log("NEXT_PUBLIC_BONDING_ADDRESS=%s", address(bonding));
        console2.log("NEXT_PUBLIC_ROUTER_ADDRESS=%s", address(router));
        console2.log("NEXT_PUBLIC_USDC_ADDRESS=%s", address(usdc));
        console2.log("NEXT_PUBLIC_CREATOR_REWARDS_ADDRESS=%s", address(rewards));
        console2.log("");
        console2.log("=== backend/.env ===");
        console2.log("INDEXER_ENABLED=true");
        console2.log("CHAIN_RPC_URL=http://127.0.0.1:8545");
        console2.log("CHAIN_ID=31337");
        console2.log("BONDING_CURVE_GRADUATION_TARGET_USD=10");
        console2.log("ZAP_ADDRESS=%s", address(zap));
        console2.log("BONDING_ADDRESS=%s", address(bonding));
        console2.log("ROUTER_ADDRESS=%s", address(router));
        console2.log("USDC_ADDRESS=%s", address(usdc));
    }
}
