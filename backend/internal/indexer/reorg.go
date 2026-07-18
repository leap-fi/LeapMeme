package indexer

import (
	"context"
	"fmt"
	"math/big"
	"strings"

	ethcommon "github.com/ethereum/go-ethereum/common"
	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/kline"
	"github.com/leap/backend/internal/model"
)

// detectAndHandleReorg compares the stored tip hash with the chain. On mismatch
// it walks back to the fork parent, deletes dirty rows, and rewinds the cursor.
func (s *Scanner) detectAndHandleReorg(ctx context.Context) error {
	state, err := model.GetIndexerCursorState(model.ChainIndexerCursorName)
	if err != nil {
		return err
	}
	if state.LastBlock == 0 {
		return nil
	}

	chainID := s.chainID.Int64()
	storedHash := strings.TrimSpace(state.LastBlockHash)
	if storedHash == "" {
		if blk, err := model.GetIndexerBlock(chainID, state.LastBlock); err == nil && blk != nil {
			storedHash = blk.BlockHash
		}
	}
	if storedHash == "" {
		// Legacy cursor without hash history: seed tip hash and continue.
		block, err := s.client.BlockByNumber(ctx, new(big.Int).SetUint64(state.LastBlock))
		if err != nil {
			return fmt.Errorf("seed tip block %d: %w", state.LastBlock, err)
		}
		hash := block.Hash().Hex()
		parent := ""
		if block.NumberU64() > 0 {
			parent = block.ParentHash().Hex()
		}
		if err := model.UpsertIndexerBlock(&model.IndexerBlock{
			ChainID:     chainID,
			BlockNumber: state.LastBlock,
			BlockHash:   hash,
			ParentHash:  parent,
		}); err != nil {
			return err
		}
		return model.SetIndexerCursorState(model.ChainIndexerCursorName, state.LastBlock, hash)
	}

	tip, err := s.client.BlockByNumber(ctx, new(big.Int).SetUint64(state.LastBlock))
	if err != nil {
		return fmt.Errorf("fetch tip block %d: %w", state.LastBlock, err)
	}
	if strings.EqualFold(tip.Hash().Hex(), storedHash) {
		return nil
	}

	common.SysError(fmt.Sprintf(
		"indexer reorg detected at block %d: stored=%s chain=%s",
		state.LastBlock, storedHash, tip.Hash().Hex(),
	))

	keepBlock, keepHash, err := s.findForkParent(ctx, state.LastBlock)
	if err != nil {
		return err
	}

	affected, err := model.RewindIndexerAfter(chainID, model.ChainIndexerCursorName, keepBlock, keepHash)
	if err != nil {
		return fmt.Errorf("rewind after %d: %w", keepBlock, err)
	}

	common.SysLog(fmt.Sprintf(
		"indexer reorg rewind to block %d (%s), affected tokens=%d",
		keepBlock, keepHash, len(affected),
	))

	if len(affected) > 0 {
		s.recoverAfterReorg(ctx, affected)
	}
	return nil
}

func (s *Scanner) findForkParent(ctx context.Context, from uint64) (uint64, string, error) {
	lookback := s.cfg.ReorgLookback
	if lookback == 0 {
		lookback = 64
	}
	chainID := s.chainID.Int64()

	n := from
	var walked uint64
	for n > 0 && walked < lookback {
		n--
		walked++

		stored, err := model.GetIndexerBlock(chainID, n)
		if err != nil {
			return 0, "", err
		}
		if stored == nil {
			// No more local history: treat this as the safe parent.
			return n, "", nil
		}

		block, err := s.client.BlockByNumber(ctx, new(big.Int).SetUint64(n))
		if err != nil {
			return 0, "", fmt.Errorf("fetch block %d during reorg walk: %w", n, err)
		}
		if strings.EqualFold(block.Hash().Hex(), stored.BlockHash) {
			return n, stored.BlockHash, nil
		}
	}

	// Exhausted lookback without a match — rewind to the oldest checked parent.
	if n > 0 {
		if stored, err := model.GetIndexerBlock(chainID, n); err == nil && stored != nil {
			return n, stored.BlockHash, nil
		}
	}
	return n, "", nil
}

func (s *Scanner) recoverAfterReorg(ctx context.Context, tokenAddresses []string) {
	for _, raw := range tokenAddresses {
		addr := ethcommon.HexToAddress(raw)
		token, err := model.GetTokenByAddress(raw)
		if err != nil || token == nil {
			continue
		}
		s.syncCreatorFromChain(ctx, token, addr)
		_ = s.syncTokenMarketState(ctx, addr)
	}
	s.rebuildKlinesAfterReorg(ctx, tokenAddresses)
}

func (s *Scanner) rebuildKlinesAfterReorg(ctx context.Context, tokenAddresses []string) {
	eng := kline.Default()
	if eng == nil || len(tokenAddresses) == 0 {
		return
	}
	if _, err := eng.Backfill(ctx, kline.BackfillOptions{
		Addresses: tokenAddresses,
		Replace:   true,
	}); err != nil {
		common.SysError(fmt.Sprintf("indexer reorg kline rebuild: %v", err))
	}
}

func (s *Scanner) commitBlock(blockNumber uint64, blockHash, parentHash string) error {
	chainID := s.chainID.Int64()
	if err := model.UpsertIndexerBlock(&model.IndexerBlock{
		ChainID:     chainID,
		BlockNumber: blockNumber,
		BlockHash:   blockHash,
		ParentHash:  parentHash,
	}); err != nil {
		return err
	}
	return model.SetIndexerCursorState(model.ChainIndexerCursorName, blockNumber, blockHash)
}
