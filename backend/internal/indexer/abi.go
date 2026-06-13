package indexer

import (
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/crypto"
)

var (
	tokenCreatedTopic = crypto.Keccak256Hash([]byte("TokenCreated(address,address,address)"))
	transferTopic     = crypto.Keccak256Hash([]byte("Transfer(address,address,uint256)"))
)

const zapABIJSON = `[
  {"type":"event","name":"TokenCreated","inputs":[
    {"name":"token","type":"address","indexed":true},
    {"name":"creator","type":"address","indexed":true},
    {"name":"ltAddress","type":"address","indexed":true}
  ]},
  {"type":"function","name":"buy","inputs":[
    {"name":"tokenAddress","type":"address"},
    {"name":"usdcAmount","type":"uint256"},
    {"name":"minTokensOut","type":"uint256"},
    {"name":"referrer","type":"address"}
  ]},
  {"type":"function","name":"sell","inputs":[
    {"name":"tokenAddress","type":"address"},
    {"name":"tokenAmount","type":"uint256"},
    {"name":"minUsdcOut","type":"uint256"}
  ]},
  {"type":"function","name":"buyWithPermit","inputs":[
    {"name":"tokenAddress","type":"address"},
    {"name":"usdcAmount","type":"uint256"},
    {"name":"minTokensOut","type":"uint256"},
    {"name":"referrer","type":"address"},
    {"name":"p","type":"tuple","components":[
      {"name":"value","type":"uint256"},
      {"name":"deadline","type":"uint256"},
      {"name":"v","type":"uint8"},
      {"name":"r","type":"bytes32"},
      {"name":"s","type":"bytes32"}
    ]}
  ]},
  {"type":"function","name":"sellWithPermit","inputs":[
    {"name":"tokenAddress","type":"address"},
    {"name":"tokenAmount","type":"uint256"},
    {"name":"minUsdcOut","type":"uint256"},
    {"name":"p","type":"tuple","components":[
      {"name":"value","type":"uint256"},
      {"name":"deadline","type":"uint256"},
      {"name":"v","type":"uint8"},
      {"name":"r","type":"bytes32"},
      {"name":"s","type":"bytes32"}
    ]}
  ]},
  {"type":"function","name":"createToken","inputs":[
    {"name":"params","type":"tuple","components":[
      {"name":"name","type":"string"},
      {"name":"ticker","type":"string"},
      {"name":"description","type":"string"},
      {"name":"image","type":"string"},
      {"name":"urls","type":"string[3]"},
      {"name":"ltAddress","type":"address"},
      {"name":"salt","type":"bytes32"}
    ]},
    {"name":"seedUsdcAmount","type":"uint256"}
  ]},
  {"type":"function","name":"createTokenWithPermit","inputs":[
    {"name":"params","type":"tuple","components":[
      {"name":"name","type":"string"},
      {"name":"ticker","type":"string"},
      {"name":"description","type":"string"},
      {"name":"image","type":"string"},
      {"name":"urls","type":"string[3]"},
      {"name":"ltAddress","type":"address"},
      {"name":"salt","type":"bytes32"}
    ]},
    {"name":"seedUsdcAmount","type":"uint256"},
    {"name":"p","type":"tuple","components":[
      {"name":"value","type":"uint256"},
      {"name":"deadline","type":"uint256"},
      {"name":"v","type":"uint8"},
      {"name":"r","type":"bytes32"},
      {"name":"s","type":"bytes32"}
    ]}
  ]}
]`

const erc20MetaABIJSON = `[
  {"type":"function","name":"name","inputs":[],"outputs":[{"type":"string"}],"stateMutability":"view"},
  {"type":"function","name":"symbol","inputs":[],"outputs":[{"type":"string"}],"stateMutability":"view"},
  {"type":"function","name":"totalSupply","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"balanceOf","inputs":[{"name":"account","type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view"}
]`

const bondingABIJSON = `[
  {"type":"function","name":"isGraduated","inputs":[{"name":"token","type":"address"}],"outputs":[{"type":"bool"}],"stateMutability":"view"}
]`

const bounceLtABIJSON = `[
  {"type":"function","name":"targetAsset","inputs":[],"outputs":[{"type":"string"}],"stateMutability":"view"},
  {"type":"function","name":"targetLeverage","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"isLong","inputs":[],"outputs":[{"type":"bool"}],"stateMutability":"view"}
]`

const bounceFactoryABIJSON = `[
  {"type":"function","name":"lts","inputs":[],"outputs":[{"type":"address[]"}],"stateMutability":"view"}
]`

const bounceGlobalStorageABIJSON = `[
  {"type":"function","name":"factory","inputs":[],"outputs":[{"type":"address"}],"stateMutability":"view"}
]`

const bondingExtraABIJSON = `[
  {"type":"function","name":"bounceGlobalStorage","inputs":[],"outputs":[{"type":"address"}],"stateMutability":"view"}
]`

func parseZapABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(zapABIJSON))
}

func parseERC20MetaABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(erc20MetaABIJSON))
}

func parseBondingABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(bondingABIJSON))
}

func parseBounceLtABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(bounceLtABIJSON))
}

func parseBounceFactoryABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(bounceFactoryABIJSON))
}

func parseBounceGlobalStorageABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(bounceGlobalStorageABIJSON))
}

func parseBondingExtraABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(bondingExtraABIJSON))
}
