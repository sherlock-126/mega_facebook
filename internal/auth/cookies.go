package auth

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
)

// Cookie represents a browser cookie in the import/export JSON format.
type Cookie struct {
	Name     string  `json:"name"`
	Value    string  `json:"value"`
	Domain   string  `json:"domain"`
	Path     string  `json:"path"`
	Expires  float64 `json:"expires,omitempty"`
	HTTPOnly bool    `json:"httpOnly,omitempty"`
	Secure   bool    `json:"secure,omitempty"`
	SameSite string  `json:"sameSite,omitempty"`
}

// ParseCookieFile reads and parses a JSON cookie file.
func ParseCookieFile(path string) ([]Cookie, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read cookie file %s: %w", path, err)
	}

	var cookies []Cookie
	if err := json.Unmarshal(data, &cookies); err != nil {
		return nil, fmt.Errorf("invalid cookie file format: expected JSON array of cookie objects: %w", err)
	}

	if len(cookies) == 0 {
		return nil, fmt.Errorf("no cookies found in file %s", path)
	}

	return cookies, nil
}

// FilterFacebookCookies returns only cookies with Facebook domains.
// Returns the filtered cookies and the count of skipped non-Facebook cookies.
func FilterFacebookCookies(cookies []Cookie) (filtered []Cookie, skipped int) {
	for _, c := range cookies {
		domain := strings.ToLower(c.Domain)
		if domain == ".facebook.com" || domain == "facebook.com" ||
			strings.HasSuffix(domain, ".facebook.com") {
			filtered = append(filtered, c)
		} else {
			skipped++
		}
	}
	return filtered, skipped
}

// WriteCookieFile writes cookies to a JSON file, creating directories as needed.
func WriteCookieFile(path string, cookies []Cookie) error {
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("failed to create cookie directory %s: %w", dir, err)
	}

	data, err := json.MarshalIndent(cookies, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal cookies: %w", err)
	}

	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("failed to write cookie file %s: %w", path, err)
	}

	return nil
}

// InjectCookies loads cookies into a browser via CDP.
func InjectCookies(browser *rod.Browser, cookies []Cookie) error {
	for _, c := range cookies {
		sameSite := proto.NetworkCookieSameSiteNone
		switch strings.ToLower(c.SameSite) {
		case "lax":
			sameSite = proto.NetworkCookieSameSiteLax
		case "strict":
			sameSite = proto.NetworkCookieSameSiteStrict
		}

		var expires proto.TimeSinceEpoch
		if c.Expires > 0 {
			expires = proto.TimeSinceEpoch(c.Expires)
		}

		_, err := proto.NetworkSetCookie{
			Name:     c.Name,
			Value:    c.Value,
			Domain:   c.Domain,
			Path:     c.Path,
			Secure:   c.Secure,
			HTTPOnly: c.HTTPOnly,
			SameSite: sameSite,
			Expires:  expires,
		}.Call(browser)

		if err != nil {
			return fmt.Errorf("failed to set cookie %q: %w", c.Name, err)
		}
	}
	return nil
}

// ExtractCookies extracts Facebook cookies from the browser via CDP.
func ExtractCookies(browser *rod.Browser) ([]Cookie, error) {
	res, err := proto.NetworkGetAllCookies{}.Call(browser)
	if err != nil {
		return nil, fmt.Errorf("failed to get cookies from browser: %w", err)
	}

	var cookies []Cookie
	for _, c := range res.Cookies {
		domain := strings.ToLower(c.Domain)
		if domain == ".facebook.com" || domain == "facebook.com" ||
			strings.HasSuffix(domain, ".facebook.com") {
			cookies = append(cookies, Cookie{
				Name:     c.Name,
				Value:    c.Value,
				Domain:   c.Domain,
				Path:     c.Path,
				Expires:  float64(c.Expires),
				HTTPOnly: c.HTTPOnly,
				Secure:   c.Secure,
				SameSite: string(c.SameSite),
			})
		}
	}

	return cookies, nil
}
