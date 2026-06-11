package job

import (
	"context"
	"time"

	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/model"
	"github.com/leap/backend/setting"
)

type Job interface {
	Name() string
	Interval() time.Duration
	Run(ctx context.Context) error
}

type Registry struct {
	jobs []Job
}

var DefaultRegistry = &Registry{}

func (r *Registry) Register(job Job) {
	r.jobs = append(r.jobs, job)
}

func (r *Registry) Start(ctx context.Context) {
	// 启动所有 job，每个 job 一个 goroutine
	for _, job := range r.jobs {
		j := job
		go func() {
			ticker := time.NewTicker(j.Interval())
			defer ticker.Stop()
			for {
				// main.go 里 cancel() ，这里才能执行ctx.Done()（否则会因为channel阻塞），会退出循环，从而退出 goroutine
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					if err := j.Run(ctx); err != nil {
						common.SysError(j.Name() + ": " + err.Error())
					}
				}
			}
		}()
		common.SysLog("job started: " + job.Name())
	}
}

type SyncOptionsJob struct{}

func (SyncOptionsJob) Name() string { return "sync_options" }
func (SyncOptionsJob) Interval() time.Duration {
	return time.Duration(common.SyncFrequency) * time.Second
}

// 从数据库拉 options 到内存
func (SyncOptionsJob) Run(ctx context.Context) error {
	options, err := model.AllOptions()
	if err != nil {
		return err
	}
	// 热更新 setting
	common.OptionMapLock.Lock()
	for k, v := range options {
		common.OptionMap[k] = v
	}
	common.OptionMapLock.Unlock()
	setting.LoadFromOptionMap(common.OptionMap)
	return nil
}

type HeartbeatJob struct{}

func (HeartbeatJob) Name() string            { return "heartbeat" }
func (HeartbeatJob) Interval() time.Duration { return 5 * time.Minute }
func (HeartbeatJob) Run(ctx context.Context) error {
	// 调试模式下打日志
	if common.DebugEnabled {
		common.SysLog("heartbeat ok")
	}
	return nil
}

// SyncOptionsJob{} / HeartbeatJob{} 是 零值实例，通过下面三组方法满足接口：
//
//	类型	真实逻辑在哪
//	SyncOptionsJob
//	Name / Interval / Run（53–64 行：拉 options、热更新 setting）
//	HeartbeatJob
//	Name / Interval / Run（71–75 行：debug 打日志）
//	所以不是「先注册空壳，别处再填逻辑」，而是：注册的就是「带行为的类型」，行为在方法上。
func RegisterDefaultJobs() {
	DefaultRegistry.Register(SyncOptionsJob{})
	DefaultRegistry.Register(HeartbeatJob{})
	// ... 后续可以在这里注册其他 job
}
