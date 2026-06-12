package indexer

import (
	"context"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum"
	ethcommon "github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
)

func (s *Scanner) readTokenMeta(ctx context.Context, token ethcommon.Address) (symbol, name string) {
	// 把地址转成短地址，示例：0x1234567890123456789012345678901234567890 -> 0x1234...7890
	symbol = shortenAddress(token)
	name = symbol

	// 调用合约方法
	call := func(method string) string {
		// 通过 erc20ABI 把方法名和参数打包成数据
		data, err := s.erc20ABI.Pack(method)
		if err != nil {
			return ""
		}
		// 获取合约方法的输入参数和输出参数
		out, err := s.client.CallContract(ctx, ethereum.CallMsg{
			To:   &token,
			Data: data,
		}, nil)
		if err != nil || len(out) == 0 {
			return ""
		}
		// 通过 erc20ABI 解包数据
		values, err := s.erc20ABI.Unpack(method, out)
		if err != nil || len(values) == 0 {
			return ""
		}
		// values[0].(string) 把数据转换成字符串
		if v, ok := values[0].(string); ok {
			return strings.TrimSpace(v)
		}
		return ""
	}

	if v := call("symbol"); v != "" {
		symbol = v
	}
	if v := call("name"); v != "" {
		name = v
	}
	return symbol, name
}

type transferEvent struct {
	Token ethcommon.Address
	From  ethcommon.Address
	To    ethcommon.Address
	Value *big.Int
}

func parseTransferLogs(logs []*types.Log) []transferEvent {
	// logs 是这笔交易执行过程中、各合约 emit 的事件列表，存在链上
	out := make([]transferEvent, 0, len(logs))
	for _, lg := range logs {
		if len(lg.Topics) != 3 || lg.Topics[0] != transferTopic {
			continue
		}
		out = append(out, transferEvent{
			Token: lg.Address,
			From:  ethcommon.BytesToAddress(lg.Topics[1].Bytes()),
			To:    ethcommon.BytesToAddress(lg.Topics[2].Bytes()),
			Value: new(big.Int).SetBytes(lg.Data),
		})
	}
	return out
}

func findTransferAmount(transfers []transferEvent, token, trader ethcommon.Address, inbound bool) *big.Int {
	for _, tr := range transfers {
		if tr.Token != token {
			continue
		}
		if inbound && tr.To == trader {
			return tr.Value
		}
		if !inbound && tr.From == trader {
			return tr.Value
		}
	}
	return nil
}

func formatTokenAmount(raw *big.Int, decimals int) string {
	if raw == nil {
		return "0"
	}
	return formatUnits(raw, decimals)
}

func formatUnits(raw *big.Int, decimals int) string {
	if raw == nil {
		return "0"
	}
	if decimals == 0 {
		return raw.String()
	}
	rat := new(big.Rat).SetFrac(raw, new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil))
	return strings.TrimRight(strings.TrimRight(rat.FloatString(decimals), "0"), ".")
}

func calcPrice(volume, amount string) string {
	v, ok1 := new(big.Rat).SetString(volume)
	a, ok2 := new(big.Rat).SetString(amount)
	if !ok1 || !ok2 || a.Sign() == 0 {
		return "0"
	}
	p := new(big.Rat).Quo(v, a)
	return strings.TrimRight(strings.TrimRight(p.FloatString(18), "0"), ".")
}

func shortenAddress(addr ethcommon.Address) string {
	hex := addr.Hex()
	if len(hex) < 10 {
		return hex
	}
	return fmt.Sprintf("%s…%s", hex[:6], hex[len(hex)-4:])
}
