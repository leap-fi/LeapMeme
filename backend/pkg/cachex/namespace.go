package cachex

import "strings"

type Namespace string

func (n Namespace) prefix() string {
	ns := strings.TrimSpace(string(n)) // 去除字符串两端的空格
	ns = strings.TrimRight(ns, ":")    // 去除字符串末尾的冒号
	if ns == "" {                      // 如果字符串为空，返回空字符串
		return ""
	}
	return ns + ":" // 返回字符串加上冒号
}

func (n Namespace) FullKey(key string) string {
	key = strings.TrimSpace(key) // 去除字符串两端的空格
	if key == "" {               // 如果字符串为空，返回空字符串
		return ""
	}
	p := n.prefix() // 获取前缀
	if p == "" {    // 如果前缀为空，返回字符串去掉左边的冒号
		return strings.TrimLeft(key, ":")
	}
	if strings.HasPrefix(key, p) { // 如果字符串以前缀开头，返回字符串
		return key
	}
	return p + strings.TrimLeft(key, ":") // 返回前缀加上字符串去掉左边的冒号
}

func (n Namespace) MatchPattern() string {
	p := n.prefix()
	if p == "" {
		return "*"
	}
	return p + "*"
}
