// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockLtFactory {
    address[] private _lts;

    constructor(address[] memory lts_) {
        _lts = lts_;
    }

    function lts() external view returns (address[] memory) {
        return _lts;
    }
}
