package auth

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// ProfileConfig holds per-profile authentication settings.
type ProfileConfig struct {
	TOTPSecret string `json:"totp_secret,omitempty"`
	Name       string `json:"name,omitempty"`
}

// Config holds all profile authentication configurations.
type Config struct {
	Profiles map[string]ProfileConfig `json:"profiles"`
}

// DefaultConfigDir returns the default configuration directory (~/.mega_facebook).
func DefaultConfigDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ".mega_facebook"
	}
	return filepath.Join(home, ".mega_facebook")
}

// ConfigPath returns the path to the profiles config file.
func ConfigPath(configDir string) string {
	return filepath.Join(configDir, "profiles.json")
}

// CookieDir returns the directory for storing cookie files.
func CookieDir(configDir string) string {
	return filepath.Join(configDir, "cookies")
}

// CookiePath returns the cookie file path for a specific profile.
func CookiePath(configDir, profileID string) string {
	return filepath.Join(CookieDir(configDir), profileID+".json")
}

// LoadConfig reads the profile config from disk. Returns empty config if file doesn't exist.
func LoadConfig(configDir string) (*Config, error) {
	path := ConfigPath(configDir)

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &Config{Profiles: make(map[string]ProfileConfig)}, nil
		}
		return nil, fmt.Errorf("failed to read config file %s: %w", path, err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("invalid config file %s: %w", path, err)
	}

	if cfg.Profiles == nil {
		cfg.Profiles = make(map[string]ProfileConfig)
	}

	return &cfg, nil
}

// SaveConfig writes the profile config to disk, creating directories as needed.
func SaveConfig(configDir string, cfg *Config) error {
	if err := os.MkdirAll(configDir, 0700); err != nil {
		return fmt.Errorf("failed to create config directory %s: %w", configDir, err)
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	path := ConfigPath(configDir)
	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("failed to write config file %s: %w", path, err)
	}

	return nil
}

// GetTOTPSecret returns the TOTP secret for a profile, or empty string if not set.
func (c *Config) GetTOTPSecret(profileID string) string {
	if p, ok := c.Profiles[profileID]; ok {
		return p.TOTPSecret
	}
	return ""
}

// SetTOTPSecret sets the TOTP secret for a profile.
func (c *Config) SetTOTPSecret(profileID, secret string) {
	p := c.Profiles[profileID]
	p.TOTPSecret = secret
	c.Profiles[profileID] = p
}
