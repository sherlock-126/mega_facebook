package adspower

import "testing"

func TestNewClient_DefaultURL(t *testing.T) {
	c := NewClient("")
	if c.BaseURL != DefaultBaseURL {
		t.Errorf("expected %s, got %s", DefaultBaseURL, c.BaseURL)
	}
}

func TestNewClient_CustomURL(t *testing.T) {
	url := "http://192.168.1.100:9999"
	c := NewClient(url)
	if c.BaseURL != url {
		t.Errorf("expected %s, got %s", url, c.BaseURL)
	}
}
