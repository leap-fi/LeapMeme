package indexer

import (
	"context"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum"
	ethcommon "github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

// ReadTokenBalances returns human-readable ERC20 balances keyed by lower-case account.
func ReadTokenBalances(ctx context.Context, cfg Config, tokenAddress string, accounts []string) (map[string]string, error) {
	out := make(map[string]string)
	tokenAddress = strings.TrimSpace(tokenAddress)
	if tokenAddress == "" || len(accounts) == 0 || strings.TrimSpace(cfg.RPCURL) == "" {
		return out, nil
	}

	client, err := ethclient.DialContext(ctx, cfg.RPCURL)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	erc20ABI, err := parseERC20MetaABI()
	if err != nil {
		return nil, err
	}

	token := ethcommon.HexToAddress(tokenAddress)
	for _, account := range accounts {
		account = strings.TrimSpace(account)
		if account == "" {
			continue
		}
		holder := ethcommon.HexToAddress(account)
		data, err := erc20ABI.Pack("balanceOf", holder)
		if err != nil {
			continue
		}
		raw, err := client.CallContract(ctx, ethereum.CallMsg{To: &token, Data: data}, nil)
		if err != nil || len(raw) == 0 {
			continue
		}
		values, err := erc20ABI.Unpack("balanceOf", raw)
		if err != nil || len(values) == 0 {
			continue
		}
		if v, ok := values[0].(*big.Int); ok && v.Sign() > 0 {
			out[strings.ToLower(account)] = formatUnits(v, 18)
		}
	}
	return out, nil
}
