package indexer

import (
	"context"
	"fmt"
	"math/big"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	ethcommon "github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/kline"
	"github.com/leap/backend/internal/model"
	"gorm.io/gorm"
)

type Scanner struct {
	client    *ethclient.Client
	cfg       Config
	zapABI    abi.ABI
	erc20ABI  abi.ABI
	zapAddrs    []ethcommon.Address
	zapSet      map[ethcommon.Address]struct{}
	bondingAddr ethcommon.Address
	usdcAddr    ethcommon.Address
	chainID     *big.Int
}

// NewScanner dials RPC and prepares contract bindings.
// 连接 RPC 并准备合约绑定(abi)
func NewScanner(cfg Config) (*Scanner, error) {
	client, err := ethclient.Dial(cfg.RPCURL) // 连接 RPC 返回 client 结构体
	if err != nil {
		return nil, fmt.Errorf("dial rpc: %w", err)
	}

	zapABI, err := parseZapABI() // 解析 zap 合约的 abi
	if err != nil {
		return nil, fmt.Errorf("parse zap abi: %w", err)
	}
	erc20ABI, err := parseERC20MetaABI()
	if err != nil {
		return nil, fmt.Errorf("parse erc20 abi: %w", err)
	}

	chainID := big.NewInt(cfg.ChainID)
	if cfg.ChainID == 0 {
		chainID, err = client.ChainID(context.Background())
		if err != nil {
			return nil, fmt.Errorf("chain id: %w", err)
		}
	}

	zapAddrs := make([]ethcommon.Address, 0, len(cfg.ZapAddresses))
	zapSet := make(map[ethcommon.Address]struct{}, len(cfg.ZapAddresses))
	for _, raw := range cfg.ZapAddresses {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		addr := ethcommon.HexToAddress(raw)
		if _, ok := zapSet[addr]; ok {
			continue
		}
		zapSet[addr] = struct{}{}
		zapAddrs = append(zapAddrs, addr)
	}
	if len(zapAddrs) == 0 {
		return nil, fmt.Errorf("no zap addresses configured")
	}

	return &Scanner{
		client:      client,
		cfg:         cfg,
		zapABI:      zapABI,
		erc20ABI:    erc20ABI,
		zapAddrs:    zapAddrs,
		zapSet:      zapSet,
		bondingAddr: ethcommon.HexToAddress(cfg.BondingAddress),
		usdcAddr:    ethcommon.HexToAddress(cfg.USDCAddress),
		chainID:     chainID,
	}, nil
}

// Close releases the RPC connection.
func (s *Scanner) Close() {
	if s.client != nil {
		s.client.Close()
	}
}

// RunOnce scans up to BatchSize blocks and advances the cursor.
// 扫描 up to BatchSize 个块，并更新游标
func (s *Scanner) RunOnce(ctx context.Context) error {
	if err := s.detectAndHandleReorg(ctx); err != nil {
		return fmt.Errorf("reorg check: %w", err)
	}

	latest, err := s.client.BlockNumber(ctx) // 获取最新区块号
	if err != nil {
		return fmt.Errorf("block number: %w", err)
	}

	confirmations := s.cfg.Confirmations // 确认区块数
	if latest < confirmations {          // 如果最新区块号小于确认区块数，则返回
		return nil
	}
	// target：本轮最多扫到这里，indexer 故意不扫到链上最新块，而是停在「最新块往前数 N 块」的位置，等这几块在链上「站稳」再扫，降低遇到 链重组（reorg） 时已经入库又被回滚的风险
	target := latest - confirmations

	state, err := model.GetIndexerCursorState(model.ChainIndexerCursorName)
	if err != nil {
		return err
	}
	cursor := state.LastBlock
	if cursor == 0 { // 如果游标为0，则设置游标
		if s.cfg.StartBlock > 0 {
			if s.cfg.StartBlock > 1 { // 如果起始区块号大于1，则设置游标
				cursor = s.cfg.StartBlock - 1
			}
		} else {
			cursor = target // 如果起始区块号为0，则设置游标为目标区块号
		}
	}
	if cursor >= target { // 如果游标大于等于目标区块号，则返回
		return nil
	}

	batch := s.cfg.BatchSize // 批量大小
	if batch == 0 {
		batch = 50 // 如果批量大小为0，则设置批量大小为50
	}
	to := min(cursor+batch, target) // 结束区块号

	for blockNum := cursor + 1; blockNum <= to; blockNum++ { // 遍历区块
		block, err := s.client.BlockByNumber(ctx, new(big.Int).SetUint64(blockNum))
		if err != nil {
			return fmt.Errorf("block %d: %w", blockNum, err)
		}
		mut, err := s.collectBlock(ctx, block)
		if err != nil {
			return fmt.Errorf("block %d: %w", blockNum, err)
		}
		// 写库与 cursor 同事务：RPC 已在 collect 完成，事务内只做 DB
		if err := model.Transaction(func(tx *gorm.DB) error {
			return s.applyBlockMutation(tx, block, mut)
		}); err != nil {
			return fmt.Errorf("block %d commit: %w", blockNum, err)
		}
		s.afterBlockCommit(ctx, mut)
	}
	return nil
}

func (s *Scanner) afterBlockCommit(ctx context.Context, mut *blockMutation) {
	if mut == nil {
		return
	}
	if eng := kline.Default(); eng != nil {
		for _, trade := range mut.trades {
			eng.OnTrade(trade)
		}
	}
	for _, addr := range mut.marketSync {
		if err := s.syncTokenMarketState(ctx, addr); err != nil {
			common.SysError(fmt.Sprintf("indexer market sync %s: %v", addr.Hex(), err))
		}
	}
}

// collectBlock gathers all mutations for a block via RPC; no DB writes.
func (s *Scanner) collectBlock(ctx context.Context, block *types.Block) (*blockMutation, error) {
	mut := &blockMutation{}
	if err := s.collectTokenCreatedLogs(ctx, block, mut); err != nil {
		return nil, err
	}
	if err := s.collectCreatorTransferredLogs(ctx, block, mut); err != nil {
		return nil, err
	}
	for _, tx := range block.Transactions() {
		if tx.To() == nil {
			continue
		}
		if _, ok := s.zapSet[*tx.To()]; !ok {
			continue
		}
		if len(tx.Data()) < 4 {
			continue
		}
		method, err := s.zapABI.MethodById(tx.Data()[:4])
		if err != nil {
			continue
		}
		switch method.Name {
		case "buy", "buyWithPermit", "sell", "sellWithPermit":
			if err := s.collectTradeTx(ctx, block, tx, method.Name, mut); err != nil {
				return nil, fmt.Errorf("trade %s: %w", tx.Hash().Hex(), err)
			}
		}
	}
	return mut, nil
}

// 扫 TokenCreated 新币创建（仅收集，不写库）
func (s *Scanner) collectTokenCreatedLogs(ctx context.Context, block *types.Block, mut *blockMutation) error {
	logs, err := s.client.FilterLogs(ctx, ethereum.FilterQuery{
		FromBlock: block.Number(),
		ToBlock:   block.Number(),
		Addresses: s.zapAddrs,
		Topics:    [][]ethcommon.Hash{{tokenCreatedTopic}},
	})
	if err != nil {
		return err
	}

	blockTime := int64(block.Time()) * 1000
	for _, lg := range logs {
		if len(lg.Topics) < 4 {
			continue
		}
		tokenAddr := ethcommon.BytesToAddress(lg.Topics[1].Bytes())
		creator := ethcommon.BytesToAddress(lg.Topics[2].Bytes())
		ltAddr := ethcommon.BytesToAddress(lg.Topics[3].Bytes())

		var launch *launchParamsDecoded
		var seedUsdc *big.Int
		if tx, _, err := s.client.TransactionByHash(ctx, lg.TxHash); err == nil && tx != nil {
			launch, _ = decodeLaunchParamsFromTx(s.zapABI, tx)
			seedUsdc, _ = decodeSeedUsdcFromTx(s.zapABI, tx)
		}

		symbol, name := s.readTokenMeta(ctx, tokenAddr)
		if launch != nil {
			if launch.Ticker != "" {
				symbol = strings.TrimSpace(launch.Ticker)
			}
			if launch.Name != "" {
				name = strings.TrimSpace(launch.Name)
			}
		}
		if existing, _ := model.GetTokenByAddress(strings.ToLower(tokenAddr.Hex())); existing != nil {
			if existing.Symbol != "" && (launch == nil || launch.Ticker == "") {
				symbol = existing.Symbol
			}
			if existing.Name != "" && (launch == nil || launch.Name == "") {
				name = existing.Name
			}
		}

		token := &model.Token{
			Address:     strings.ToLower(tokenAddr.Hex()),
			Symbol:      symbol,
			Name:        name,
			Creator:     strings.ToLower(creator.Hex()),
			LtAddress:   strings.ToLower(ltAddr.Hex()),
			ZapAddress:  strings.ToLower(lg.Address.Hex()),
			TxHash:      lg.TxHash.Hex(),
			BlockNumber: block.NumberU64(),
			Status:      "TRADING",
			CreatedAt:   blockTime,
		}
		if err := s.enrichToken(ctx, token, launch); err != nil {
			common.SysError(fmt.Sprintf("indexer enrich token %s: %v", token.Address, err))
		}
		mut.addToken(token)

		if err := s.collectSeedBuy(ctx, block, lg.TxHash, tokenAddr, creator, symbol, name, seedUsdc, mut); err != nil {
			return fmt.Errorf("seed buy %s tx %s: %w", token.Address, lg.TxHash.Hex(), err)
		}
	}
	return nil
}

func (s *Scanner) collectCreatorTransferredLogs(ctx context.Context, block *types.Block, mut *blockMutation) error {
	if s.cfg.BondingAddress == "" {
		return nil
	}

	logs, err := s.client.FilterLogs(ctx, ethereum.FilterQuery{
		FromBlock: block.Number(),
		ToBlock:   block.Number(),
		Addresses: []ethcommon.Address{s.bondingAddr},
		Topics:    [][]ethcommon.Hash{{creatorTransferredTopic}},
	})
	if err != nil {
		return err
	}

	for _, lg := range logs {
		if len(lg.Topics) < 4 {
			continue
		}
		tokenAddr := ethcommon.BytesToAddress(lg.Topics[1].Bytes())
		newCreator := ethcommon.BytesToAddress(lg.Topics[3].Bytes())
		mut.addCreator(tokenAddr.Hex(), newCreator.Hex())
	}
	return nil
}

func (s *Scanner) collectSeedBuy(
	ctx context.Context,
	block *types.Block,
	txHash ethcommon.Hash,
	tokenAddr ethcommon.Address,
	creator ethcommon.Address,
	symbol, name string,
	seedUsdc *big.Int,
	mut *blockMutation,
) error {
	if seedUsdc == nil || seedUsdc.Sign() <= 0 {
		return nil
	}

	receipt, err := s.client.TransactionReceipt(ctx, txHash)
	if err != nil {
		return err
	}
	if receipt.Status != types.ReceiptStatusSuccessful {
		return nil
	}

	transfers := parseTransferLogs(receipt.Logs)
	tokenXfer := findTokenTransfer(transfers, tokenAddr, creator, true)
	if tokenXfer == nil || tokenXfer.Value == nil || tokenXfer.Value.Sign() == 0 {
		return nil
	}

	volume := formatTokenAmount(seedUsdc, 6)
	amount := formatTokenAmount(tokenXfer.Value, 18)
	price := calcPrice(volume, amount)

	trade := &model.Trade{
		ChainID:      s.chainID.Int64(),
		Hash:         txHash.Hex(),
		LogIndex:     tokenXfer.LogIndex,
		TokenAddress: strings.ToLower(tokenAddr.Hex()),
		Symbol:       symbol,
		Name:         name,
		Account:      strings.ToLower(creator.Hex()),
		Side:         "BUY",
		Amount:       amount,
		Volume:       volume,
		Price:        price,
		Source:       "zap",
		TradeTime:    int64(block.Time()) * 1000,
		BlockNumber:  block.NumberU64(),
		BlockHash:    block.Hash().Hex(),
	}
	mut.addTrade(trade)
	mut.addMarketSync(tokenAddr)
	return nil
}

func (s *Scanner) collectTradeTx(
	ctx context.Context,
	block *types.Block,
	tx *types.Transaction,
	methodName string,
	mut *blockMutation,
) error {
	receipt, err := s.client.TransactionReceipt(ctx, tx.Hash())
	if err != nil {
		return err
	}
	if receipt.Status != types.ReceiptStatusSuccessful {
		return nil
	}

	method, err := s.zapABI.MethodById(tx.Data()[:4])
	if err != nil {
		return err
	}
	values, err := method.Inputs.Unpack(tx.Data()[4:])
	if err != nil {
		return err
	}
	if len(values) < 1 {
		return nil
	}

	tokenAddr, ok := values[0].(ethcommon.Address)
	if !ok {
		return nil
	}

	signer := types.LatestSignerForChainID(s.chainID)
	trader, err := types.Sender(signer, tx)
	if err != nil {
		return err
	}

	side := "BUY"
	if strings.HasPrefix(methodName, "sell") {
		side = "SELL"
	}

	transfers := parseTransferLogs(receipt.Logs)
	var amountRaw, volumeRaw *big.Int
	var amountLogIndex uint
	zapAddr := *tx.To()
	bondingAddr := ethcommon.HexToAddress(s.cfg.BondingAddress)

	switch side {
	case "BUY":
		if len(values) > 1 {
			if v, ok := values[1].(*big.Int); ok {
				volumeRaw = buyNetUsdcToBonding(transfers, s.usdcAddr, zapAddr, bondingAddr)
				if volumeRaw == nil {
					volumeRaw = applyBuyFeeNet(v)
				}
			}
		}
		if tokenXfer := findTokenTransfer(transfers, tokenAddr, trader, true); tokenXfer != nil {
			amountRaw = tokenXfer.Value
			amountLogIndex = tokenXfer.LogIndex
		}
		if volumeRaw == nil {
			volumeRaw = findTransferAmount(transfers, s.usdcAddr, trader, false)
		}
	case "SELL":
		if len(values) > 1 {
			if v, ok := values[1].(*big.Int); ok {
				amountRaw = v
			}
		}
		volumeRaw = sellGrossUsdcFromBonding(transfers, s.usdcAddr, bondingAddr, zapAddr)
		if tokenXfer := findTokenTransfer(transfers, tokenAddr, trader, false); tokenXfer != nil {
			if amountRaw == nil {
				amountRaw = tokenXfer.Value
			}
			amountLogIndex = tokenXfer.LogIndex
		}
	}

	if amountRaw == nil || volumeRaw == nil || amountRaw.Sign() == 0 || volumeRaw.Sign() == 0 {
		return nil
	}

	if token, err := s.prepareTokenRecord(ctx, tokenAddr, block); err != nil {
		common.SysError(fmt.Sprintf("indexer ensure token %s: %v", tokenAddr.Hex(), err))
	} else if token != nil {
		mut.addToken(token)
	}

	amount := formatTokenAmount(amountRaw, 18)
	volume := formatTokenAmount(volumeRaw, 6)
	price := calcPrice(volume, amount)
	symbol, name := s.tokenDisplay(ctx, tokenAddr)

	trade := &model.Trade{
		ChainID:      s.chainID.Int64(),
		Hash:         tx.Hash().Hex(),
		LogIndex:     amountLogIndex,
		TokenAddress: strings.ToLower(tokenAddr.Hex()),
		Symbol:       symbol,
		Name:         name,
		Account:      strings.ToLower(trader.Hex()),
		Side:         side,
		Amount:       amount,
		Volume:       volume,
		Price:        price,
		Source:       "zap",
		TradeTime:    int64(block.Time()) * 1000,
		BlockNumber:  block.NumberU64(),
		BlockHash:    block.Hash().Hex(),
	}
	mut.addTrade(trade)
	mut.addMarketSync(tokenAddr)
	return nil
}

func (s *Scanner) tokenDisplay(ctx context.Context, tokenAddr ethcommon.Address) (symbol, name string) {
	addr := strings.ToLower(tokenAddr.Hex())
	if t, _ := model.GetTokenByAddress(addr); t != nil {
		if t.Symbol != "" {
			symbol = t.Symbol
		}
		if t.Name != "" {
			name = t.Name
		}
	}
	if symbol != "" && name != "" {
		return symbol, name
	}
	metaSymbol, metaName := s.readTokenMeta(ctx, tokenAddr)
	if symbol == "" {
		symbol = metaSymbol
	}
	if name == "" {
		name = metaName
	}
	return symbol, name
}
