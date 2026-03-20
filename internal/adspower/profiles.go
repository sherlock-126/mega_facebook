package adspower

import "fmt"

// ListProfiles returns all browser profiles from AdsPower.
func (c *Client) ListProfiles() ([]Profile, error) {
	var resp ListResponse
	if err := c.doGet("/api/v1/browser/list", &resp); err != nil {
		return nil, err
	}
	if resp.Code != 0 {
		return nil, fmt.Errorf("AdsPower API error: %s", resp.Msg)
	}
	return resp.Data.List, nil
}

// OpenProfile starts a browser profile by user ID.
func (c *Client) OpenProfile(userID string) (*StartData, error) {
	var resp StartResponse
	if err := c.doGet("/api/v1/browser/start?user_id="+userID, &resp); err != nil {
		return nil, err
	}
	if resp.Code != 0 {
		return nil, fmt.Errorf("AdsPower API error: %s", resp.Msg)
	}
	return &resp.Data, nil
}

// CloseProfile stops a browser profile by user ID.
func (c *Client) CloseProfile(userID string) error {
	var resp StopResponse
	if err := c.doGet("/api/v1/browser/stop?user_id="+userID, &resp); err != nil {
		return err
	}
	if resp.Code != 0 {
		return fmt.Errorf("AdsPower API error: %s", resp.Msg)
	}
	return nil
}
