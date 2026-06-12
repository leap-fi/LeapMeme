package dto

// MemeResponse aligns with web/lib/apis/meme-server/types.ts BaseResponse<T>
type MemeResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
	Ts   int64  `json:"ts"`
	Data any    `json:"data"`
}
