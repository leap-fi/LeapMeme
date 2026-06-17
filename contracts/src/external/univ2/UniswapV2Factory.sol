// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

import {IUniswapV2Factory} from "./IUniswapV2.sol";
import {UniswapV2Pair} from "./UniswapV2Pair.sol";

/// @dev Uniswap V2 Factory 的 Solidity 0.8 移植。CREATE2 部署 Pair；
///      前端通过 `getPair` 映射读取地址（不依赖 init code hash）。
contract UniswapV2Factory is IUniswapV2Factory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    constructor(address feeToSetter_) {
        feeToSetter = feeToSetter_;
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "UniswapV2: IDENTICAL_ADDRESSES");
        (address token0, address token1) =
            tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "UniswapV2: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "UniswapV2: PAIR_EXISTS");

        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        UniswapV2Pair newPair = new UniswapV2Pair{salt: salt}();
        newPair.initialize(token0, token1);
        pair = address(newPair);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address feeTo_) external {
        require(msg.sender == feeToSetter, "UniswapV2: FORBIDDEN");
        feeTo = feeTo_;
    }

    function setFeeToSetter(address feeToSetter_) external {
        require(msg.sender == feeToSetter, "UniswapV2: FORBIDDEN");
        feeToSetter = feeToSetter_;
    }
}
