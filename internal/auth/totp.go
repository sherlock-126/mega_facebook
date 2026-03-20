package auth

import (
	"fmt"
	"strings"
	"time"

	"github.com/go-rod/rod"
	"github.com/go-rod/rod/lib/proto"
	"github.com/pquerna/otp/totp"
)

// GenerateTOTP generates a TOTP code from a base32-encoded secret.
func GenerateTOTP(secret string) (string, error) {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return "", fmt.Errorf("empty TOTP secret")
	}

	code, err := totp.GenerateCode(secret, time.Now())
	if err != nil {
		return "", fmt.Errorf("invalid TOTP secret: %w", err)
	}

	return code, nil
}

// Enter2FACode finds the 2FA input field on the page and enters the code.
func Enter2FACode(page *rod.Page, code string) error {
	// Try known 2FA input selectors
	for _, sel := range twoFASelectors {
		has, el, err := page.Has(sel)
		if err != nil || !has {
			continue
		}

		if err := el.SelectAllText(); err != nil {
			return fmt.Errorf("failed to select 2FA input: %w", err)
		}
		if err := el.Input(code); err != nil {
			return fmt.Errorf("failed to enter 2FA code: %w", err)
		}

		// Look for submit button and click it
		submitSelectors := []string{
			"button[type='submit']",
			"#checkpointSubmitButton",
			"button[name='submit[Continue]']",
		}
		for _, btnSel := range submitSelectors {
			has, btn, err := page.Has(btnSel)
			if err == nil && has {
				if err := btn.Click(proto.InputMouseButtonLeft, 1); err != nil {
					return fmt.Errorf("failed to click 2FA submit button: %w", err)
				}
				// Wait for navigation after submit
				time.Sleep(3 * time.Second)
				return nil
			}
		}

		return fmt.Errorf("2FA code entered but submit button not found")
	}

	return fmt.Errorf("2FA input field not found on page")
}
