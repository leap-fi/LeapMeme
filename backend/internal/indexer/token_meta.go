package indexer

import (
	"context"
	"fmt"
	"math/big"
	"reflect"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	ethcommon "github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/model"
)

type launchParamsDecoded struct {
	Name        string
	Ticker      string
	Description string
	Image       string
	Urls        [3]string
	LtAddress   ethcommon.Address
}

func decodeLaunchParamsFromTx(zapABI abi.ABI, tx *types.Transaction) (*launchParamsDecoded, error) {
	if tx == nil || len(tx.Data()) < 4 {
		return nil, nil
	}
	method, err := zapABI.MethodById(tx.Data()[:4])
	if err != nil {
		return nil, nil
	}
	if method.Name != "createToken" && method.Name != "createTokenWithPermit" {
		return nil, nil
	}
	values, err := method.Inputs.Unpack(tx.Data()[4:])
	if err != nil || len(values) < 1 {
		return nil, err
	}
	return unpackLaunchParams(values[0])
}

func decodeSeedUsdcFromTx(zapABI abi.ABI, tx *types.Transaction) (*big.Int, error) {
	if tx == nil || len(tx.Data()) < 4 {
		return nil, nil
	}
	method, err := zapABI.MethodById(tx.Data()[:4])
	if err != nil {
		return nil, nil
	}
	if method.Name != "createToken" && method.Name != "createTokenWithPermit" {
		return nil, nil
	}
	values, err := method.Inputs.Unpack(tx.Data()[4:])
	if err != nil || len(values) < 2 {
		return nil, err
	}
	seed, ok := values[1].(*big.Int)
	if !ok || seed == nil {
		return nil, nil
	}
	return seed, nil
}

func unpackLaunchParams(raw any) (*launchParamsDecoded, error) {
	v := reflect.ValueOf(raw)
	if v.Kind() == reflect.Pointer {
		if v.IsNil() {
			return nil, nil
		}
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return nil, fmt.Errorf("unexpected launch params type %T", raw)
	}

	out := &launchParamsDecoded{}
	if f := v.FieldByName("Name"); f.IsValid() {
		out.Name, _ = f.Interface().(string)
	}
	if f := v.FieldByName("Ticker"); f.IsValid() {
		out.Ticker, _ = f.Interface().(string)
	}
	if f := v.FieldByName("Description"); f.IsValid() {
		out.Description, _ = f.Interface().(string)
	}
	if f := v.FieldByName("Image"); f.IsValid() {
		out.Image, _ = f.Interface().(string)
	}
	if f := v.FieldByName("LtAddress"); f.IsValid() {
		if addr, ok := f.Interface().(ethcommon.Address); ok {
			out.LtAddress = addr
		}
	}
	if f := v.FieldByName("Urls"); f.IsValid() {
		switch urls := f.Interface().(type) {
		case [3]string:
			out.Urls = urls
		case []string:
			for i := 0; i < len(urls) && i < 3; i++ {
				out.Urls[i] = urls[i]
			}
		}
	}
	return out, nil
}

func (s *Scanner) enrichToken(ctx context.Context, token *model.Token, launch *launchParamsDecoded) error {
	if launch != nil {
		if launch.Ticker != "" {
			token.Symbol = strings.TrimSpace(launch.Ticker)
		}
		if launch.Name != "" {
			token.Name = strings.TrimSpace(launch.Name)
		}
		token.Description = strings.TrimSpace(launch.Description)
		token.Logo = strings.TrimSpace(launch.Image)
		token.Twitter = strings.TrimSpace(launch.Urls[0])
		token.Telegram = strings.TrimSpace(launch.Urls[1])
		token.Website = strings.TrimSpace(launch.Urls[2])
		if launch.LtAddress != (ethcommon.Address{}) {
			token.LtAddress = strings.ToLower(launch.LtAddress.Hex())
		}
	}

	if s.cfg.BondingAddress != "" {
		token.BondingAddress = strings.ToLower(s.cfg.BondingAddress)
	}
	if zap := strings.TrimSpace(token.ZapAddress); zap != "" {
		token.RouterAddress = strings.ToLower(common.RouterForZap(zap))
	} else if s.cfg.RouterAddress != "" {
		token.RouterAddress = strings.ToLower(s.cfg.RouterAddress)
	}

	tokenAddr := ethcommon.HexToAddress(token.Address)
	if supply, err := s.readTotalSupply(ctx, tokenAddr); err == nil && supply != "" {
		token.TotalSupply = supply
	}

	ltAddr := token.LtAddress
	if ltAddr == "" && launch != nil && launch.LtAddress != (ethcommon.Address{}) {
		ltAddr = strings.ToLower(launch.LtAddress.Hex())
	}
	if ltAddr != "" {
		if meta, err := s.readLtMeta(ctx, ethcommon.HexToAddress(ltAddr)); err == nil {
			token.TargetAsset = meta.TargetAsset
			if meta.TargetLeverage > 0 {
				lev := meta.TargetLeverage
				token.TargetLeverage = &lev
			}
			isLong := meta.IsLong
			token.IsLong = &isLong
		}
	}

	s.syncTokenGraduation(ctx, token, tokenAddr)
	s.syncBondingCurveFromChain(ctx, token, tokenAddr)
	s.refreshTokenMarketFields(ctx, token, tokenAddr)

	return nil
}

// ensureTokenRecord creates or refreshes a token row before trade indexing.
// Tokens created before INDEXER_START_BLOCK only appear as trades until this runs.
func (s *Scanner) ensureTokenRecord(ctx context.Context, tokenAddr ethcommon.Address, block *types.Block) error {
	addr := strings.ToLower(tokenAddr.Hex())
	existing, err := model.GetTokenByAddress(addr)
	if err != nil {
		return err
	}

	blockTime := time.Now().UnixMilli()
	var blockNum uint64
	if block != nil {
		blockTime = int64(block.Time()) * 1000
		blockNum = block.NumberU64()
	}

	if existing != nil {
		s.syncTokenGraduation(ctx, existing, tokenAddr)
		return model.UpsertToken(existing)
	}

	symbol, name := s.readTokenMeta(ctx, tokenAddr)
	token := &model.Token{
		Address:     addr,
		Symbol:      symbol,
		Name:        name,
		Status:      "TRADING",
		CreatedAt:   blockTime,
		BlockNumber: blockNum,
	}
	if len(s.zapAddrs) > 0 {
		token.ZapAddress = strings.ToLower(s.zapAddrs[0].Hex())
	}
	if err := s.enrichToken(ctx, token, nil); err != nil {
		common.SysError(fmt.Sprintf("indexer enrich token %s: %v", addr, err))
	}
	return model.UpsertToken(token)
}

func (s *Scanner) syncTokenGraduation(ctx context.Context, token *model.Token, tokenAddr ethcommon.Address) {
	if token == nil {
		return
	}
	switch strings.ToUpper(strings.TrimSpace(token.Status)) {
	case "GRADUATED", "COMPLETED", "MIGRATED":
		return
	}
	graduated, err := s.readIsGraduated(ctx, tokenAddr)
	if err != nil || !graduated {
		return
	}
	token.Status = "GRADUATED"
	token.BondingCurveProgress = "100"
	if token.GraduatedAt == 0 {
		token.GraduatedAt = token.CreatedAt
		if token.GraduatedAt == 0 {
			token.GraduatedAt = time.Now().UnixMilli()
		}
	}
}

// BackfillMissingTokens indexes token rows for addresses seen in trades but missing in tokens.
func (s *Scanner) BackfillMissingTokens(ctx context.Context) error {
	addresses, err := model.ListTradeTokenAddressesMissing()
	if err != nil {
		return err
	}
	for _, raw := range addresses {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		if err := s.ensureTokenRecord(ctx, ethcommon.HexToAddress(raw), nil); err != nil {
			common.SysError(fmt.Sprintf("indexer backfill token %s: %v", raw, err))
		}
	}
	return nil
}

func (s *Scanner) readTotalSupply(ctx context.Context, token ethcommon.Address) (string, error) {
	raw, err := s.readRawTotalSupply(ctx, token)
	if err != nil {
		return "", err
	}
	if raw == nil {
		return "", nil
	}
	return formatUnits(raw, 18), nil
}

func (s *Scanner) readRawTotalSupply(ctx context.Context, token ethcommon.Address) (*big.Int, error) {
	data, err := s.erc20ABI.Pack("totalSupply")
	if err != nil {
		return nil, err
	}
	out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &token, Data: data}, nil)
	if err != nil {
		return nil, err
	}
	values, err := s.erc20ABI.Unpack("totalSupply", out)
	if err != nil || len(values) == 0 {
		return nil, err
	}
	if v, ok := values[0].(*big.Int); ok {
		return v, nil
	}
	return nil, nil
}

type ltMeta struct {
	TargetAsset    string
	TargetLeverage int
	IsLong         bool
}

func (s *Scanner) readLtMeta(ctx context.Context, lt ethcommon.Address) (ltMeta, error) {
	ltABI, err := parseBounceLtABI()
	if err != nil {
		return ltMeta{}, err
	}
	readString := func(method string) (string, error) {
		data, err := ltABI.Pack(method)
		if err != nil {
			return "", err
		}
		out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &lt, Data: data}, nil)
		if err != nil {
			return "", err
		}
		values, err := ltABI.Unpack(method, out)
		if err != nil || len(values) == 0 {
			return "", err
		}
		v, _ := values[0].(string)
		return strings.TrimSpace(v), nil
	}
	readBool := func(method string) (bool, error) {
		data, err := ltABI.Pack(method)
		if err != nil {
			return false, err
		}
		out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &lt, Data: data}, nil)
		if err != nil {
			return false, err
		}
		values, err := ltABI.Unpack(method, out)
		if err != nil || len(values) == 0 {
			return false, err
		}
		v, _ := values[0].(bool)
		return v, nil
	}
	readUint := func(method string) (int, error) {
		data, err := ltABI.Pack(method)
		if err != nil {
			return 0, err
		}
		out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &lt, Data: data}, nil)
		if err != nil {
			return 0, err
		}
		values, err := ltABI.Unpack(method, out)
		if err != nil || len(values) == 0 {
			return 0, err
		}
		if v, ok := values[0].(*big.Int); ok {
			return int(v.Int64() / 1e18), nil
		}
		return 0, nil
	}

	asset, err := readString("targetAsset")
	if err != nil {
		return ltMeta{}, err
	}
	lev, _ := readUint("targetLeverage")
	isLong, _ := readBool("isLong")
	return ltMeta{TargetAsset: asset, TargetLeverage: lev, IsLong: isLong}, nil
}

type ltMarketState struct {
	ltMeta
	MintPaused   bool
	ExchangeRate string
	TotalAssets  string
}

func (s *Scanner) readLtMarketState(ctx context.Context, lt ethcommon.Address) (ltMarketState, error) {
	meta, err := s.readLtMeta(ctx, lt)
	if err != nil {
		return ltMarketState{}, err
	}
	exchangeRate, _ := s.readLtBigIntString(ctx, lt, "exchangeRate")
	totalAssets, _ := s.readLtBigIntString(ctx, lt, "totalAssets")
	mintPaused, _ := s.readLtBool(ctx, lt, "mintPaused")
	return ltMarketState{
		ltMeta:       meta,
		MintPaused:   mintPaused,
		ExchangeRate: exchangeRate,
		TotalAssets:  totalAssets,
	}, nil
}

func (s *Scanner) readLtBigIntString(ctx context.Context, lt ethcommon.Address, method string) (string, error) {
	ltABI, err := parseBounceLtABI()
	if err != nil {
		return "0", err
	}
	data, err := ltABI.Pack(method)
	if err != nil {
		return "0", err
	}
	out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &lt, Data: data}, nil)
	if err != nil {
		return "0", err
	}
	values, err := ltABI.Unpack(method, out)
	if err != nil || len(values) == 0 {
		return "0", err
	}
	if v, ok := values[0].(*big.Int); ok {
		return v.String(), nil
	}
	return "0", nil
}

func (s *Scanner) readLtBool(ctx context.Context, lt ethcommon.Address, method string) (bool, error) {
	ltABI, err := parseBounceLtABI()
	if err != nil {
		return false, err
	}
	data, err := ltABI.Pack(method)
	if err != nil {
		return false, err
	}
	out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &lt, Data: data}, nil)
	if err != nil {
		return false, err
	}
	values, err := ltABI.Unpack(method, out)
	if err != nil || len(values) == 0 {
		return false, err
	}
	v, _ := values[0].(bool)
	return v, nil
}

func (s *Scanner) readIsGraduated(ctx context.Context, token ethcommon.Address) (bool, error) {
	if s.cfg.BondingAddress == "" {
		return false, nil
	}
	bondingABI, err := parseBondingABI()
	if err != nil {
		return false, err
	}
	bonding := ethcommon.HexToAddress(s.cfg.BondingAddress)
	data, err := bondingABI.Pack("isGraduated", token)
	if err != nil {
		return false, err
	}
	out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &bonding, Data: data}, nil)
	if err != nil {
		return false, err
	}
	values, err := bondingABI.Unpack("isGraduated", out)
	if err != nil || len(values) == 0 {
		return false, err
	}
	v, _ := values[0].(bool)
	return v, nil
}

func (s *Scanner) readRaisedUsdc(ctx context.Context, token ethcommon.Address) (*big.Int, error) {
	if s.cfg.BondingAddress == "" {
		return nil, nil
	}
	bondingABI, err := parseBondingABI()
	if err != nil {
		return nil, err
	}
	bonding := ethcommon.HexToAddress(s.cfg.BondingAddress)
	data, err := bondingABI.Pack("raisedUsdc", token)
	if err != nil {
		return nil, err
	}
	out, err := s.client.CallContract(ctx, ethereum.CallMsg{To: &bonding, Data: data}, nil)
	if err != nil {
		return nil, err
	}
	values, err := bondingABI.Unpack("raisedUsdc", out)
	if err != nil || len(values) == 0 {
		return nil, err
	}
	raised, ok := values[0].(*big.Int)
	if !ok {
		return nil, nil
	}
	return raised, nil
}

func (s *Scanner) syncBondingCurveFromChain(ctx context.Context, token *model.Token, tokenAddr ethcommon.Address) {
	if token == nil {
		return
	}
	switch strings.ToUpper(strings.TrimSpace(token.Status)) {
	case "GRADUATED", "COMPLETED", "MIGRATED":
		token.BondingCurveProgress = "100"
		if raised, err := s.readRaisedUsdc(ctx, tokenAddr); err == nil && raised != nil {
			token.BondingCurveVolume = formatTokenAmount(raised, 6)
		}
		return
	}
	raised, err := s.readRaisedUsdc(ctx, tokenAddr)
	if err != nil || raised == nil {
		return
	}
	volumeStr := formatTokenAmount(raised, 6)
	volume := model.ParseDecimalString(volumeStr)
	token.BondingCurveVolume = volumeStr
	progress := volume / common.GraduationTargetUSD() * 100
	if progress > 100 {
		progress = 100
	}
	if progress < 0 {
		progress = 0
	}
	token.BondingCurveProgress = fmt.Sprintf("%.4f", progress)
}
