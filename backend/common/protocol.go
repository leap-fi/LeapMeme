package common

import (
	"context"
	"fmt"
	"math"
	"math/big"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	ethcommon "github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

const usdcDecimals = 6

// ProtocolConfig holds economic parameters shared by indexer, API and docs.
// Source is "chain" when synced from deployed contracts, otherwise "env".
type ProtocolConfig struct {
	GraduationTargetUSD float64
	MinSeedUsdc         float64
	MaxSeedUsdc         float64
	MinBuyUsdc          float64
	MinSellUsdc         float64
	MaxTradeUsdc        *float64
	BuyFeeBps           int
	SellFeeBps          int
	CreatorFeeShareBps  int
	SeedPresets         []float64
	Source              string
}

var (
	protocolMu sync.RWMutex
	Protocol   ProtocolConfig
)

func GraduationTargetUSD() float64 {
	protocolMu.RLock()
	defer protocolMu.RUnlock()
	return Protocol.GraduationTargetUSD
}

func loadProtocolFromEnv() {
	cfg := ProtocolConfig{
		GraduationTargetUSD: float64(GetEnvOrDefault("BONDING_CURVE_GRADUATION_TARGET_USD", 1000)),
		MinSeedUsdc:         GetEnvOrDefaultFloat("PROTOCOL_MIN_SEED_USDC", 0),
		MaxSeedUsdc:         GetEnvOrDefaultFloat("PROTOCOL_MAX_SEED_USDC", 20),
		MinBuyUsdc:          GetEnvOrDefaultFloat("PROTOCOL_MIN_BUY_USDC", 0.0001),
		MinSellUsdc:         GetEnvOrDefaultFloat("PROTOCOL_MIN_SELL_USDC", 0),
		BuyFeeBps:           GetEnvOrDefault("PROTOCOL_BUY_FEE_BPS", 75),
		SellFeeBps:          GetEnvOrDefault("PROTOCOL_SELL_FEE_BPS", 75),
		CreatorFeeShareBps:  GetEnvOrDefault("PROTOCOL_CREATOR_FEE_SHARE_BPS", 6667),
		Source:              "env",
	}
	if raw := strings.TrimSpace(os.Getenv("PROTOCOL_MAX_TRADE_USDC")); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil && v > 0 {
			cfg.MaxTradeUsdc = &v
		}
	}
	cfg.SeedPresets = parseSeedPresetsEnv(os.Getenv("PROTOCOL_SEED_PRESETS"), cfg.MaxSeedUsdc)

	protocolMu.Lock()
	Protocol = cfg
	protocolMu.Unlock()
}

// InitProtocol loads env defaults then optionally overwrites from on-chain getters.
func InitProtocol() {
	loadProtocolFromEnv()
	if !GetEnvOrDefaultBool("PROTOCOL_SYNC_FROM_CHAIN", true) {
		return
	}
	if strings.TrimSpace(ChainRPCURL) == "" ||
		strings.TrimSpace(BondingAddress) == "" ||
		strings.TrimSpace(ZapAddress) == "" {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
	defer cancel()

	if err := syncProtocolFromChain(ctx); err != nil {
		SysError("protocol sync from chain: " + err.Error())
		return
	}
	SysLog(fmt.Sprintf(
		"protocol params synced from chain (graduation=%.4f USDC, seed 0-%.0f, minBuy=%g)",
		GraduationTargetUSD(),
		Protocol.MaxSeedUsdc,
		Protocol.MinBuyUsdc,
	))
}

func GetProtocolConfig() ProtocolConfig {
	protocolMu.RLock()
	defer protocolMu.RUnlock()
	out := Protocol
	out.SeedPresets = append([]float64(nil), Protocol.SeedPresets...)
	if Protocol.MaxTradeUsdc != nil {
		v := *Protocol.MaxTradeUsdc
		out.MaxTradeUsdc = &v
	}
	return out
}

func parseSeedPresetsEnv(raw string, maxSeed float64) []float64 {
	raw = strings.TrimSpace(raw)
	if raw != "" {
		parts := strings.Split(raw, ",")
		out := make([]float64, 0, len(parts))
		seen := make(map[string]struct{})
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			v, err := strconv.ParseFloat(part, 64)
			if err != nil || v < 0 || v > maxSeed {
				continue
			}
			key := strconv.FormatFloat(v, 'f', -1, 64)
			if _, ok := seen[key]; ok {
				continue
			}
			seen[key] = struct{}{}
			out = append(out, v)
		}
		if len(out) > 0 {
			return out
		}
	}
	return defaultSeedPresets(maxSeed)
}

func defaultSeedPresets(maxSeed float64) []float64 {
	candidates := []float64{0, 5, 10, 20}
	out := make([]float64, 0, len(candidates))
	seen := make(map[string]struct{})
	for _, v := range candidates {
		if v > maxSeed {
			continue
		}
		key := strconv.FormatFloat(v, 'f', -1, 64)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, v)
	}
	if maxSeed > 0 {
		key := strconv.FormatFloat(maxSeed, 'f', -1, 64)
		if _, ok := seen[key]; !ok {
			out = append(out, maxSeed)
		}
	}
	if len(out) == 0 {
		return []float64{0}
	}
	return out
}

func GetEnvOrDefaultFloat(key string, defaultVal float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return defaultVal
	}
	v, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return defaultVal
	}
	return v
}

const zapProtocolABIJSON = `[
  {"type":"function","name":"MIN_SEED_USDC","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"MAX_SEED_USDC","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"MIN_USDC_AMOUNT","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"MAX_USDC_PER_TRADE","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"buyFeeBps","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"sellFeeBps","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"creatorFeeShareBps","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"}
]`

const bondingProtocolABIJSON = `[
  {"type":"function","name":"GRADUATION_USDC","inputs":[],"outputs":[{"type":"uint256"}],"stateMutability":"view"}
]`

func syncProtocolFromChain(ctx context.Context) error {
	client, err := ethclient.DialContext(ctx, ChainRPCURL)
	if err != nil {
		return err
	}
	defer client.Close()

	zapABI, err := abi.JSON(strings.NewReader(zapProtocolABIJSON))
	if err != nil {
		return err
	}
	bondingABI, err := abi.JSON(strings.NewReader(bondingProtocolABIJSON))
	if err != nil {
		return err
	}

	zapAddr := ethcommon.HexToAddress(ZapAddress)
	bondingAddr := ethcommon.HexToAddress(BondingAddress)

	readUintAt := func(contract ethcommon.Address, contractABI abi.ABI, method string) (*big.Int, error) {
		data, err := contractABI.Pack(method)
		if err != nil {
			return nil, err
		}
		out, err := client.CallContract(ctx, ethereum.CallMsg{To: &contract, Data: data}, nil)
		if err != nil {
			return nil, err
		}
		values, err := contractABI.Unpack(method, out)
		if err != nil || len(values) == 0 {
			return nil, fmt.Errorf("unpack %s", method)
		}
		v, ok := values[0].(*big.Int)
		if !ok || v == nil {
			return nil, fmt.Errorf("invalid %s", method)
		}
		return v, nil
	}

	gradRaw, err := readUintAt(bondingAddr, bondingABI, "GRADUATION_USDC")
	if err != nil {
		return err
	}
	minSeed, err := readUintAt(zapAddr, zapABI, "MIN_SEED_USDC")
	if err != nil {
		return err
	}
	maxSeed, err := readUintAt(zapAddr, zapABI, "MAX_SEED_USDC")
	if err != nil {
		return err
	}
	minBuy, err := readUintAt(zapAddr, zapABI, "MIN_USDC_AMOUNT")
	if err != nil {
		return err
	}
	maxTrade, err := readUintAt(zapAddr, zapABI, "MAX_USDC_PER_TRADE")
	if err != nil {
		return err
	}
	buyFee, err := readUintAt(zapAddr, zapABI, "buyFeeBps")
	if err != nil {
		return err
	}
	sellFee, err := readUintAt(zapAddr, zapABI, "sellFeeBps")
	if err != nil {
		return err
	}
	creatorShare, err := readUintAt(zapAddr, zapABI, "creatorFeeShareBps")
	if err != nil {
		return err
	}

	cfg := GetProtocolConfig()
	cfg.GraduationTargetUSD = rawUsdcToFloat(gradRaw)
	cfg.MinSeedUsdc = rawUsdcToFloat(minSeed)
	cfg.MaxSeedUsdc = rawUsdcToFloat(maxSeed)
	cfg.MinBuyUsdc = rawUsdcToFloat(minBuy)
	cfg.BuyFeeBps = int(buyFee.Int64())
	cfg.SellFeeBps = int(sellFee.Int64())
	cfg.CreatorFeeShareBps = int(creatorShare.Int64())
	cfg.Source = "chain"
	if maxTrade.Sign() > 0 && maxTrade.BitLen() < 200 {
		v := rawUsdcToFloat(maxTrade)
		if math.IsInf(v, 0) || v <= 0 {
			cfg.MaxTradeUsdc = nil
		} else {
			cfg.MaxTradeUsdc = &v
		}
	} else {
		cfg.MaxTradeUsdc = nil
	}
	cfg.SeedPresets = defaultSeedPresets(cfg.MaxSeedUsdc)

	protocolMu.Lock()
	Protocol = cfg
	protocolMu.Unlock()
	return nil
}

func rawUsdcToFloat(raw *big.Int) float64 {
	if raw == nil {
		return 0
	}
	rat := new(big.Rat).SetFrac(raw, new(big.Int).Exp(big.NewInt(10), big.NewInt(usdcDecimals), nil))
	f, _ := rat.Float64()
	return f
}
