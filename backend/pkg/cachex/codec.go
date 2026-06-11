package cachex

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

// 下面的 StringCodec 和 JSONCodec 都是 ValueCodec 接口的实现
type ValueCodec[V any] interface {
	Encode(v V) (string, error)
	Decode(s string) (V, error)
}
type StringCodec struct{}

func (c StringCodec) Encode(v string) (string, error) { return v, nil }
func (c StringCodec) Decode(s string) (string, error) { return s, nil }

type JSONCodec[V any] struct{}

func (c JSONCodec[V]) Encode(v V) (string, error) {
	b, err := json.Marshal(v) // []byte，内容是 JSON 文本的 UTF-8 字节
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func (c JSONCodec[V]) Decode(s string) (V, error) {
	var v V
	if strings.TrimSpace(s) == "" {
		return v, fmt.Errorf("empty json value")
	}
	if err := json.Unmarshal([]byte(s), &v); err != nil {
		return v, err
	}
	return v, nil
}

type IntCodec struct{}

func (c IntCodec) Encode(v int) (string, error) {
	return strconv.Itoa(v), nil
}

func (c IntCodec) Decode(s string) (int, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, fmt.Errorf("empty int value")
	}
	return strconv.Atoi(s)
}
