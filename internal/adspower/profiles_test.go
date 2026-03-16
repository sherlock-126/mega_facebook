package adspower

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func setupTestServer(handler http.HandlerFunc) (*httptest.Server, *Client) {
	srv := httptest.NewServer(handler)
	client := NewClient(srv.URL)
	return srv, client
}

func TestListProfiles(t *testing.T) {
	srv, client := setupTestServer(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/browser/list" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		w.Write([]byte(`{"code":0,"msg":"success","data":{"list":[{"serial_number":"1","name":"profile1","user_id":"abc123","group_id":"g1"},{"serial_number":"2","name":"profile2","user_id":"def456","group_id":"g2"}]}}`))
	})
	defer srv.Close()

	profiles, err := client.ListProfiles()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(profiles) != 2 {
		t.Fatalf("expected 2 profiles, got %d", len(profiles))
	}
	if profiles[0].UserID != "abc123" {
		t.Errorf("expected user_id abc123, got %s", profiles[0].UserID)
	}
	if profiles[1].Name != "profile2" {
		t.Errorf("expected name profile2, got %s", profiles[1].Name)
	}
}

func TestListProfiles_Empty(t *testing.T) {
	srv, client := setupTestServer(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"code":0,"msg":"success","data":{"list":[]}}`))
	})
	defer srv.Close()

	profiles, err := client.ListProfiles()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(profiles) != 0 {
		t.Errorf("expected 0 profiles, got %d", len(profiles))
	}
}

func TestOpenProfile(t *testing.T) {
	srv, client := setupTestServer(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/browser/start" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.URL.Query().Get("user_id") != "abc123" {
			t.Errorf("unexpected user_id: %s", r.URL.Query().Get("user_id"))
		}
		w.Write([]byte(`{"code":0,"msg":"success","data":{"ws":{"puppeteer":"ws://127.0.0.1:9222/devtools/browser/xxx","selenium":"127.0.0.1:9515"},"debug_port":"9222"}}`))
	})
	defer srv.Close()

	data, err := client.OpenProfile("abc123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if data.DebugPort != "9222" {
		t.Errorf("expected debug_port 9222, got %s", data.DebugPort)
	}
	if !strings.Contains(data.WS.Puppeteer, "ws://") {
		t.Errorf("expected puppeteer WS URL, got %s", data.WS.Puppeteer)
	}
}

func TestOpenProfile_APIError(t *testing.T) {
	srv, client := setupTestServer(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"code":-1,"msg":"profile not found"}`))
	})
	defer srv.Close()

	_, err := client.OpenProfile("invalid")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "profile not found") {
		t.Errorf("expected error to contain 'profile not found', got: %s", err.Error())
	}
}

func TestCloseProfile(t *testing.T) {
	srv, client := setupTestServer(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/v1/browser/stop" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		if r.URL.Query().Get("user_id") != "abc123" {
			t.Errorf("unexpected user_id: %s", r.URL.Query().Get("user_id"))
		}
		w.Write([]byte(`{"code":0,"msg":"success"}`))
	})
	defer srv.Close()

	err := client.CloseProfile("abc123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCloseProfile_APIError(t *testing.T) {
	srv, client := setupTestServer(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"code":-1,"msg":"failed to close"}`))
	})
	defer srv.Close()

	err := client.CloseProfile("abc123")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "failed to close") {
		t.Errorf("expected error to contain 'failed to close', got: %s", err.Error())
	}
}

func TestConnectionRefused(t *testing.T) {
	client := NewClient("http://127.0.0.1:1")

	_, err := client.ListProfiles()
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "failed to connect to AdsPower") {
		t.Errorf("expected connection error message, got: %s", err.Error())
	}
}

func TestMalformedJSON(t *testing.T) {
	srv, client := setupTestServer(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`not json`))
	})
	defer srv.Close()

	_, err := client.ListProfiles()
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "unexpected response format") {
		t.Errorf("expected format error message, got: %s", err.Error())
	}
}
