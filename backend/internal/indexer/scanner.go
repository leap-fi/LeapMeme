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
		if err := s.processBlock(ctx, block); err != nil {
			return fmt.Errorf("block %d: %w", blockNum, err)
		}
		parent := ""
		if blockNum > 0 {
			parent = block.ParentHash().Hex()
		}
		if err := s.commitBlock(blockNum, block.Hash().Hex(), parent); err != nil {
			return fmt.Errorf("commit block %d: %w", blockNum, err)
		}
	}
	return nil
}

func (s *Scanner) processBlock(ctx context.Context, block *types.Block) error {
	// 处理 TokenCreated 新币创建
	if err := s.processTokenCreatedLogs(ctx, block); err != nil {
		return err
	}

	// 处理创作者转让
	if err := s.processCreatorTransferredLogs(ctx, block); err != nil {
		return err
	}

	// 处理交易
	for _, tx := range block.Transactions() {
		if tx.To() == nil {
			continue
		}
		if _, ok := s.zapSet[*tx.To()]; !ok {
			continue
		}
		// 如果交易数据长度小于4，则跳过
		if len(tx.Data()) < 4 {
			continue
		}
		// 获取交易方法
		method, err := s.zapABI.MethodById(tx.Data()[:4])
		if err != nil {
			continue
		}
		// 处理交易
		switch method.Name {
		// 处理买入和卖出交易
		case "buy", "buyWithPermit", "sell", "sellWithPermit":
			if err := s.processTradeTx(ctx, block, tx, method.Name); err != nil {
				common.SysError(fmt.Sprintf("indexer trade %s: %v", tx.Hash().Hex(), err))
			}
		}
	}
	return nil
}

// 扫 TokenCreated 新币创建
func (s *Scanner) processTokenCreatedLogs(ctx context.Context, block *types.Block) error {
	// 这里就是在读合约发出的事件 logs，不是读 calldata
	// 合约内部写的执行过程中 emit 出来的记录
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
		if err := model.UpsertToken(token); err != nil {
			return err
		}
		if err := s.recordSeedBuy(ctx, block, lg.TxHash, tokenAddr, creator, symbol, name, seedUsdc); err != nil {
			common.SysError(fmt.Sprintf("indexer seed buy %s: %v", token.Address, err))
		}
	}
	return nil
}

func (s *Scanner) processCreatorTransferredLogs(ctx context.Context, block *types.Block) error {
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
		if err := model.UpdateTokenCreator(
			strings.ToLower(tokenAddr.Hex()),
			strings.ToLower(newCreator.Hex()),
		); err != nil {
			return err
		}
	}
	return nil
}

func (s *Scanner) recordSeedBuy(
	ctx context.Context,
	block *types.Block,
	txHash ethcommon.Hash,
	tokenAddr ethcommon.Address,
	creator ethcommon.Address,
	symbol, name string,
	seedUsdc *big.Int,
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
	if err := model.InsertTradeIgnoreDuplicate(trade); err != nil {
		return err
	}
	if eng := kline.Default(); eng != nil {
		eng.OnTrade(trade)
	}

	_ = s.syncTokenMarketState(ctx, tokenAddr)
	return nil
}

func (s *Scanner) processTradeTx(
	ctx context.Context,
	block *types.Block,
	tx *types.Transaction,
	methodName string,
) error {
	// 获取交易回执
	receipt, err := s.client.TransactionReceipt(ctx, tx.Hash())
	if err != nil {
		return err
	}
	// 如果交易回执状态不是成功，则跳过
	if receipt.Status != types.ReceiptStatusSuccessful {
		return nil
	}

	// 获取交易方法
	method, err := s.zapABI.MethodById(tx.Data()[:4])
	if err != nil {
		return err
	}
	// 获取交易方法参数
	values, err := method.Inputs.Unpack(tx.Data()[4:])
	if err != nil {
		return err
	}
	// 如果交易方法参数长度小于1，则跳过
	if len(values) < 1 {
		return nil
	}

	// 获取交易方法参数中的 token 地址
	tokenAddr, ok := values[0].(ethcommon.Address)
	if !ok {
		return nil
	}

	// 获取交易发送者
	signer := types.LatestSignerForChainID(s.chainID)
	trader, err := types.Sender(signer, tx)
	if err != nil {
		return err
	}

	// 获取交易方向
	side := "BUY"
	if strings.HasPrefix(methodName, "sell") {
		side = "SELL"
	}

	// 获取交易日志
	transfers := parseTransferLogs(receipt.Logs)
	// 获取交易金额和交易量
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

	if err := s.ensureTokenRecord(ctx, tokenAddr, block); err != nil {
		common.SysError(fmt.Sprintf("indexer ensure token %s: %v", tokenAddr.Hex(), err))
	}

	amount := formatTokenAmount(amountRaw, 18)
	volume := formatTokenAmount(volumeRaw, 6)
	price := calcPrice(volume, amount)

	// 获取 token 符号和名称
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
	// 插入交易
	if err := model.InsertTradeIgnoreDuplicate(trade); err != nil {
		return err
	}

	if eng := kline.Default(); eng != nil {
		eng.OnTrade(trade)
	}

	_ = s.syncTokenMarketState(ctx, tokenAddr)
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
