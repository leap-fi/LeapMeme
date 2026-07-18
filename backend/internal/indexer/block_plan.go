package indexer

import (
	"fmt"
	"strings"

	ethcommon "github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/leap/backend/internal/model"
	"gorm.io/gorm"
)

// blockMutation holds all DB writes for one block. RPC happens before apply;
// cursor + rows commit in a single transaction.
type blockMutation struct {
	tokens         []*model.Token
	creatorUpdates []creatorUpdate
	trades         []*model.Trade
	marketSync     []ethcommon.Address
}

type creatorUpdate struct {
	address string
	creator string
}

func (m *blockMutation) addToken(token *model.Token) {
	if m == nil || token == nil {
		return
	}
	addr := strings.ToLower(strings.TrimSpace(token.Address))
	for i, existing := range m.tokens {
		if strings.EqualFold(existing.Address, addr) {
			m.tokens[i] = token
			return
		}
	}
	m.tokens = append(m.tokens, token)
}

func (m *blockMutation) addCreator(address, creator string) {
	if m == nil {
		return
	}
	address = strings.ToLower(strings.TrimSpace(address))
	creator = strings.ToLower(strings.TrimSpace(creator))
	if address == "" || creator == "" {
		return
	}
	m.creatorUpdates = append(m.creatorUpdates, creatorUpdate{address: address, creator: creator})
}

func (m *blockMutation) addTrade(trade *model.Trade) {
	if m == nil || trade == nil {
		return
	}
	m.trades = append(m.trades, trade)
}

func (m *blockMutation) addMarketSync(addr ethcommon.Address) {
	if m == nil {
		return
	}
	for _, existing := range m.marketSync {
		if existing == addr {
			return
		}
	}
	m.marketSync = append(m.marketSync, addr)
}

func (s *Scanner) applyBlockMutation(tx *gorm.DB, block *types.Block, mut *blockMutation) error {
	if mut == nil {
		mut = &blockMutation{}
	}
	for _, token := range mut.tokens {
		if err := model.UpsertTokenTx(tx, token); err != nil {
			return fmt.Errorf("upsert token %s: %w", token.Address, err)
		}
	}
	for _, upd := range mut.creatorUpdates {
		if err := model.UpdateTokenCreatorTx(tx, upd.address, upd.creator); err != nil {
			return fmt.Errorf("update creator %s: %w", upd.address, err)
		}
	}
	for _, trade := range mut.trades {
		if err := model.InsertTradeIgnoreDuplicateTx(tx, trade); err != nil {
			return fmt.Errorf("insert trade %s#%d: %w", trade.Hash, trade.LogIndex, err)
		}
	}

	blockNum := block.NumberU64()
	blockHash := block.Hash().Hex()
	parent := ""
	if blockNum > 0 {
		parent = block.ParentHash().Hex()
	}
	if err := model.UpsertIndexerBlockTx(tx, &model.IndexerBlock{
		ChainID:     s.chainID.Int64(),
		BlockNumber: blockNum,
		BlockHash:   blockHash,
		ParentHash:  parent,
	}); err != nil {
		return fmt.Errorf("upsert indexer block: %w", err)
	}
	if err := model.SetIndexerCursorStateTx(tx, model.ChainIndexerCursorName, blockNum, blockHash); err != nil {
		return fmt.Errorf("set cursor: %w", err)
	}
	return nil
}
