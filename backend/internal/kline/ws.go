package kline

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/leap/backend/common"
	"github.com/leap/backend/internal/model"
)

var (
	errInvalidArgument = errors.New("invalid argument")
	errChannelMissing  = errors.New("channel does not exist")
	errPeriodMissing   = errors.New("period does not support")
	errEventMissing    = errors.New("event type not support")
)

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

const (
	wsPingInterval = 20 * time.Second
	wsPongWait     = 60 * time.Second
)

// HandleWS upgrades GET /ws/kline and manages subscribe/unsubscribe + heartbeat.
func HandleWS(engine *Engine) gin.HandlerFunc {
	return func(c *gin.Context) {
		if engine == nil {
			c.String(http.StatusServiceUnavailable, "kline engine unavailable")
			return
		}
		conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}

		hub := engine.hub
		client := hub.Register(conn)
		defer func() {
			hub.Unregister(client)
			_ = conn.Close()
		}()

		_ = conn.SetReadDeadline(time.Now().Add(wsPongWait))
		conn.SetPongHandler(func(string) error {
			return conn.SetReadDeadline(time.Now().Add(wsPongWait))
		})

		done := make(chan struct{})
		go func() {
			defer close(done)
			for {
				mt, payload, err := conn.ReadMessage()
				if err != nil {
					return
				}
				_ = conn.SetReadDeadline(time.Now().Add(wsPongWait))
				switch mt {
				case websocket.TextMessage:
					raw := strings.TrimSpace(string(payload))
					if raw == "pong" {
						continue
					}
					handleClientText(engine, hub, client, raw)
				case websocket.PingMessage:
					_ = conn.WriteControl(websocket.PongMessage, nil, time.Now().Add(10*time.Second))
				}
			}
		}()

		ticker := time.NewTicker(wsPingInterval)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.TextMessage, []byte("ping")); err != nil {
					return
				}
			}
		}
	}
}

func handleClientText(engine *Engine, hub *Hub, client *client, raw string) {
	if raw == "ping" {
		_ = client.conn.WriteMessage(websocket.TextMessage, []byte("pong"))
		return
	}

	var msg wsClientMessage
	if err := json.Unmarshal([]byte(raw), &msg); err != nil {
		writeAck(client, "error", wsArg{}, 1001, "invalid argument")
		return
	}
	op := strings.ToLower(strings.TrimSpace(msg.Op))
	if op == "" {
		writeAck(client, "error", wsArg{}, 1005, "event type not support")
		return
	}
	if len(msg.Args) == 0 {
		writeAck(client, "error", wsArg{}, 1001, "invalid argument")
		return
	}

	for _, arg := range msg.Args {
		if strings.ToLower(arg.Channel) != "kline" {
			writeAck(client, op, arg, 1002, "channel does not exist")
			continue
		}
		if _, err := NormalizePeriod(arg.Period); err != nil {
			writeAck(client, op, arg, 1007, "period does not support")
			continue
		}
		address := normalizeAddress(arg.Address)
		if address == "" {
			writeAck(client, op, arg, 1001, "invalid argument")
			continue
		}
		exists, err := tokenExistsForKline(address)
		if err != nil {
			writeAck(client, op, arg, 1000, "internal error")
			continue
		}
		if !exists {
			writeAck(client, op, arg, 1003, "token does not exist")
			continue
		}

		var handleErr error
		switch op {
		case "subscribe":
			handleErr = hub.Subscribe(client, arg.Period, address)
		case "unsubscribe":
			handleErr = hub.Unsubscribe(client, arg.Period, address)
		default:
			writeAck(client, op, arg, 1005, "event type not support")
			continue
		}
		if handleErr != nil {
			writeAck(client, op, arg, 1001, "invalid argument")
			continue
		}
		writeAck(client, op, wsArg{Channel: "kline", Period: arg.Period, Address: address}, 0, "success")

		if op == "subscribe" {
			if open, ok := engine.GetOpenCandle(address, arg.Period); ok {
				engine.broadcastPrepared(address, arg.Period, open)
			}
		}
	}
}

func tokenExistsForKline(address string) (bool, error) {
	if t, _ := model.GetTokenByAddress(address); t != nil {
		return true, nil
	}
	return model.TokenHasTrades(address)
}

func writeAck(client *client, event string, arg wsArg, code int, msg string) {
	payload, _ := json.Marshal(wsAckMessage{
		Event: event,
		Arg:   arg,
		Code:  code,
		Msg:   msg,
	})
	_ = client.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	if err := client.conn.WriteMessage(websocket.TextMessage, payload); err != nil {
		common.SysError("kline ws ack: " + err.Error())
	}
}
