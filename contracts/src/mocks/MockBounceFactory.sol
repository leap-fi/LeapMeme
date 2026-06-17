// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UniswapV2Factory} from "../external/univ2/UniswapV2Factory.sol";

/// @dev 本地 Bounce 生态工厂：同时提供 LT 列表（lts）与 UniV2 池（getPair/createPair）。
///      前端 `lt-registry.ts` 与 `trade-quote.ts` 通过同一地址读取两类接口。
contract MockBounceFactory is UniswapV2Factory {
    address[] private _lts;

    constructor(address[] memory lts_, address feeToSetter_) UniswapV2Factory(feeToSetter_) {
        _lts = lts_;
    }

    function lts() external view returns (address[] memory) {
        return _lts;
    }
}
