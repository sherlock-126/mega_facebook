package adspower

// APIResponse is the common envelope for all AdsPower API responses.
type APIResponse struct {
	Code int    `json:"code"`
	Msg  string `json:"msg"`
}

// Profile represents a browser profile from AdsPower.
type Profile struct {
	SerialNumber string `json:"serial_number"`
	Name         string `json:"name"`
	UserID       string `json:"user_id"`
	GroupID      string `json:"group_id"`
}

// ListResponse is the response from /api/v1/browser/list.
type ListResponse struct {
	APIResponse
	Data struct {
		List []Profile `json:"list"`
	} `json:"data"`
}

// WebSocketInfo contains browser connection details.
type WebSocketInfo struct {
	Puppeteer string `json:"puppeteer"`
	Selenium  string `json:"selenium"`
}

// StartData contains the data returned when starting a browser.
type StartData struct {
	WS        WebSocketInfo `json:"ws"`
	DebugPort string        `json:"debug_port"`
}

// StartResponse is the response from /api/v1/browser/start.
type StartResponse struct {
	APIResponse
	Data StartData `json:"data"`
}

// StopResponse is the response from /api/v1/browser/stop.
type StopResponse struct {
	APIResponse
}
