// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev EIP-1167 clone implementation；由 Bonding 部署并 initialize。
contract LeapToken is ERC20 {
    address public bonding;
    bool private _initialized;

    constructor() ERC20("", "") {}

    function initialize(address bonding_, string memory name_, string memory symbol_) external {
        require(!_initialized, "initialized");
        require(bonding == address(0), "initialized");
        bonding = bonding_;
        _initialized = true;
        // ERC20 name/symbol via internal storage override pattern
        _setNameSymbol(name_, symbol_);
    }

    string private _tokenName;
    string private _tokenSymbol;

    function _setNameSymbol(string memory name_, string memory symbol_) private {
        _tokenName = name_;
        _tokenSymbol = symbol_;
    }

    function name() public view override returns (string memory) {
        return bytes(_tokenName).length > 0 ? _tokenName : super.name();
    }

    function symbol() public view override returns (string memory) {
        return bytes(_tokenSymbol).length > 0 ? _tokenSymbol : super.symbol();
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == bonding, "bonding");
        _mint(to, amount);
    }
}
