// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev EIP-1167 clone 实现；由 Bonding 部署并 initialize。
///      内置 clone 安全的 EIP-2612 permit：DOMAIN_SEPARATOR 动态计算（不缓存），
///      name 取自存储，因此每个 clone 的 domain 都正确。供 Zap.sellWithPermit 使用。
contract LeapToken is ERC20 {
    bytes32 private constant PERMIT_TYPEHASH = keccak256(
        "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );
    bytes32 private constant EIP712_DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    address public bonding;
    bool private _initialized;

    string private _tokenName;
    string private _tokenSymbol;

    mapping(address => uint256) public nonces;

    constructor() ERC20("", "") {}

    function initialize(address bonding_, string memory name_, string memory symbol_) external {
        require(!_initialized, "initialized");
        require(bonding == address(0), "initialized");
        bonding = bonding_;
        _initialized = true;
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

    function version() external pure returns (string memory) {
        return "1";
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == bonding, "bonding");
        _mint(to, amount);
    }

    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes(name())),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @dev EIP-2612。
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline, "permit expired");
        bytes32 structHash =
            keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
        address recovered = ecrecover(digest, v, r, s);
        require(recovered != address(0) && recovered == owner, "invalid signature");
        _approve(owner, spender, value);
    }
}
