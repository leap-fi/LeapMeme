// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockGlobalStorage {
    address public factory;

    constructor(address factory_) {
        factory = factory_;
    }
}
