package adspower

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const DefaultBaseURL = "http://localhost:50151"

// Client communicates with the AdsPower Local API.
type Client struct {
	BaseURL    string
	HTTPClient *http.Client
}

// NewClient creates an AdsPower client with the given base URL.
// If baseURL is empty, DefaultBaseURL is used.
func NewClient(baseURL string) *Client {
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	return &Client{
		BaseURL: baseURL,
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// doGet performs a GET request and decodes the JSON response into dest.
func (c *Client) doGet(path string, dest interface{}) error {
	url := c.BaseURL + path

	resp, err := c.HTTPClient.Get(url)
	if err != nil {
		return fmt.Errorf("failed to connect to AdsPower at %s: %w (is AdsPower running?)", c.BaseURL, err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response from AdsPower: %w", err)
	}

	if err := json.Unmarshal(body, dest); err != nil {
		return fmt.Errorf("unexpected response format from AdsPower: %w", err)
	}

	return nil
}
