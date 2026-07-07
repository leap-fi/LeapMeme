package indexer

import (
	"context"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	ethcommon "github.com/ethereum/go-ethereum/common"
	"github.com/leap/backend/internal/model"
)

const (
	marginalBuyUsdcRaw = 1_000_000 // 1 USDC (6 decimals)
	buyFeeBps          = 75
)

const routerABIJSON = `[
  {"type":"function","name":"getAmountOut","inputs":[
    {"name":"token","type":"address"},
    {"name":"isBuy","type":"bool"},
    {"name":"amountIn","type":"uint256"}
  ],"outputs":[{"type":"uint256"}],"stateMutability":"view"}
]`

const bondingMarketABIJSON = `[
  {"type":"function","name":"isGraduated","inputs":[{"name":"token","type":"address"}],"outputs":[{"type":"bool"}],"stateMutability":"view"},
  {"type":"function","name":"raisedUsdc","inputs":[{"name":"token","type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"reserveUsdc","inputs":[{"name":"token","type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view"},
  {"type":"function","name":"reserveToken","inputs":[{"name":"token","type":"address"}],"outputs":[{"type":"uint256"}],"stateMutability":"view"}
]`

func parseRouterABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(routerABIJSON))
}

func parseBondingMarketABI() (abi.ABI, error) {
	return abi.JSON(strings.NewReader(bondingMarketABIJSON))
}

func findUsdcTransferBetween(
	transfers []transferEvent,
	usdc ethcommon.Address,
	from, to ethcommon.Address,
) *big.Int {
	for _, tr := range transfers {
		if tr.Token != usdc {
			continue
		}
		if tr.From == from && tr.To == to {
			return tr.Value
		}
	}
	return nil
}

// Buy net USDC = Zap → Bonding (curve input, after protocol fee).
func buyNetUsdcToBonding(
	transfers []transferEvent,
	usdc, zap, bonding ethcommon.Address,
) *big.Int {
	return findUsdcTransferBetween(transfers, usdc, zap, bonding)
}

// Sell gross USDC = Bonding → Zap (curve output, before user fee split).
func sellGrossUsdcFromBonding(
	transfers []transferEvent,
	usdc, bonding, zap ethcommon.Address,
) *big.Int {
	return findUsdcTransferBetween(transfers, usdc, bonding, zap)
}

func applyBuyFeeNet(gross *big.Int) *big.Int {
	if gross == nil || gross.Sign() <= 0 {
		return nil
	}
	fee := new(big.Int).Mul(gross, big.NewInt(buyFeeBps))
	fee.Div(fee, big.NewInt(10_000))
	return new(big.Int).Sub(gross, fee)
}

func (s *Scanner) readMarginalPriceUsdc(ctx context.Context, token ethcommon.Address) (string, error) {
	if s.cfg.RouterAddress != "" {
		if price, err := s.readMarginalPriceFromRouter(ctx, token); err == nil && price != "" && price != "0" {
			return price, nil
		}
	}
	return s.readMarginalPriceFromReserves(ctx, token)
}

func (s *Scanner) readMarginalPriceFromRouter(ctx context.Context, token ethcommon.Address) (string, error) {
	routerABI, err := parseRouterABI()
	if err != nil {
		return "", err
	}
	router := ethcommon.HexToAddress(s.cfg.RouterAddress)
	amountIn := big.NewInt(marginalBuyUsdcRaw)
	data, err := routerABI.Pack("getAmountOut", token, true, amountIn)
	if err != nil {
		return "", err
	}
	out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &router, Data: data}, nil)
	if err != nil {
		return "", err
	}
	values, err := routerABI.Unpack("getAmountOut", out)
	if err != nil || len(values) == 0 {
		return "", err
	}
	tokensOut, ok := values[0].(*big.Int)
	if !ok || tokensOut == nil || tokensOut.Sign() <= 0 {
		return "", fmt.Errorf("zero router quote")
	}
	return calcPrice("1", formatTokenAmount(tokensOut, 18)), nil
}

func (s *Scanner) readMarginalPriceFromReserves(ctx context.Context, token ethcommon.Address) (string, error) {
	if s.cfg.BondingAddress == "" {
		return "", fmt.Errorf("bonding not configured")
	}
	bondingABI, err := parseBondingMarketABI()
	if err != nil {
		return "", err
	}
	bonding := ethcommon.HexToAddress(s.cfg.BondingAddress)

	readUint := func(method string) (*big.Int, error) {
		data, err := bondingABI.Pack(method, token)
		if err != nil {
			return nil, err
		}
		out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &bonding, Data: data}, nil)
		if err != nil {
			return nil, err
		}
		values, err := bondingABI.Unpack(method, out)
		if err != nil || len(values) == 0 {
			return nil, err
		}
		v, ok := values[0].(*big.Int)
		if !ok {
			return nil, fmt.Errorf("invalid %s", method)
		}
		return v, nil
	}

	usdcReserve, err := readUint("reserveUsdc")
	if err != nil {
		return "", err
	}
	tokenReserve, err := readUint("reserveToken")
	if err != nil {
		return "", err
	}
	if usdcReserve.Sign() <= 0 || tokenReserve.Sign() <= 0 {
		return "", fmt.Errorf("empty reserves")
	}

	// USDC (6 dec) per token (18 dec): usdcReserve / tokenReserve * 1e12
	num := new(big.Rat).SetInt(new(big.Int).Mul(usdcReserve, big.NewInt(1_000_000_000_000)))
	den := new(big.Rat).SetInt(tokenReserve)
	p := new(big.Rat).Quo(num, den)
	return strings.TrimRight(strings.TrimRight(p.FloatString(18), "0"), "."), nil
}

func (s *Scanner) refreshTokenMarketFields(ctx context.Context, token *model.Token, tokenAddr ethcommon.Address) {
	if token == nil {
		return
	}
	if supply, err := s.readTotalSupply(ctx, tokenAddr); err == nil && supply != "" {
		token.TotalSupply = supply
	}
	s.syncBondingCurveFromChain(ctx, token, tokenAddr)
	s.syncTokenGraduation(ctx, token, tokenAddr)
	if price, err := s.readMarginalPriceUsdc(ctx, tokenAddr); err == nil && price != "" && price != "0" {
		token.LastPrice = price
		if mc, ok := model.CalcMarketCap(price, token.TotalSupply); ok {
			token.MarketCap = mc
		}
	}
}

func (s *Scanner) syncTokenMarketState(ctx context.Context, tokenAddr ethcommon.Address) error {
	addr := strings.ToLower(tokenAddr.Hex())
	token, err := model.GetTokenByAddress(addr)
	if err != nil || token == nil {
		return err
	}
	s.refreshTokenMarketFields(ctx, token, tokenAddr)
	return model.UpsertToken(token)
}
