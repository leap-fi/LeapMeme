package job

import (
	"context"
	"sync"
	"time"

	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/indexer"
)

type ChainIndexerJob struct {
	mu      sync.Mutex
	scanner *indexer.Scanner
}

func (ChainIndexerJob) Name() string { return "chain_indexer" }

func (j *ChainIndexerJob) Interval() time.Duration {
	sec := common.IndexerPollIntervalSec
	if sec <= 0 {
		sec = 3
	}
	return time.Duration(sec) * time.Second
}

func (j *ChainIndexerJob) Run(ctx context.Context) error {
	cfg := indexer.LoadConfig()
	if !cfg.Enabled() {
		return nil
	}

	j.mu.Lock()
	if j.scanner == nil {
		scanner, err := indexer.NewScanner(cfg)
		if err != nil {
			j.mu.Unlock()
			return err
		}
		j.scanner = scanner
	}
	scanner := j.scanner
	j.mu.Unlock()

	return scanner.RunOnce(ctx)
}
