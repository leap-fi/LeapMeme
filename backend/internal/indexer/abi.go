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
  ]}
]`

const erc20MetaABIJSON = `[
  {"type":"function","name":"name","inputs":[],"outputs":[{"type":"string"}],"stateMutability":"view"},
  {"type":"function","name":"symbol","inputs":[],"outputs":[{"type":"string"}],"stateMutability":"view"}
]`

func parseZapABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(zapABIJSON))
}

func parseERC20MetaABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(erc20MetaABIJSON))
}
