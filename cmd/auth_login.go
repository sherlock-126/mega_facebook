package cmd

import (
	"fmt"
	"os"

	"github.com/sherlock-126/mega_facebook/internal/adspower"
	"github.com/sherlock-126/mega_facebook/internal/auth"
	"github.com/sherlock-126/mega_facebook/internal/browser"
	"github.com/spf13/cobra"
)

var authLoginCmd = &cobra.Command{
	Use:   "login <profile_id>",
	Short: "Perform full Facebook login flow with cookies and 2FA",
	Long: `Attempt to log into Facebook using an AdsPower profile:
1. Load saved cookies (if any) and inject them
2. Navigate to Facebook and check session state
3. If 2FA is required and a TOTP secret is configured, auto-enter the code
4. Report final session state`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		profileID := args[0]

		cfgDir := configDir
		if cfgDir == "" {
			cfgDir = auth.DefaultConfigDir()
		}

		// Open AdsPower profile
		client := adspower.NewClient(adspowerURL)
		fmt.Printf("Opening AdsPower profile %s...\n", profileID)
		data, err := client.OpenProfile(profileID)
		if err != nil {
			return err
		}

		wsURL := data.WS.Puppeteer
		if wsURL == "" {
			return fmt.Errorf("AdsPower did not return a puppeteer WebSocket URL for profile %s", profileID)
		}

		// Connect browser
		fmt.Println("Connecting to browser...")
		result, err := browser.Connect(wsURL)
		if err != nil {
			return err
		}
		defer result.Browser.Close()

		// Try to load and inject saved cookies
		cookiePath := auth.CookiePath(cfgDir, profileID)
		if _, err := os.Stat(cookiePath); err == nil {
			fmt.Println("Loading saved cookies...")
			cookies, err := auth.ParseCookieFile(cookiePath)
			if err != nil {
				fmt.Printf("Warning: failed to load cookies: %v\n", err)
			} else {
				fbCookies, _ := auth.FilterFacebookCookies(cookies)
				if len(fbCookies) > 0 {
					if err := auth.InjectCookies(result.Browser, fbCookies); err != nil {
						fmt.Printf("Warning: failed to inject some cookies: %v\n", err)
					} else {
						fmt.Printf("Injected %d cookies.\n", len(fbCookies))
					}
				}
			}
		}

		// Check session state
		fmt.Println("Checking Facebook session...")
		state, err := auth.CheckSessionState(result.Browser)
		if err != nil {
			return fmt.Errorf("failed to check session: %w", err)
		}

		// Handle 2FA if needed
		if state == auth.State2FARequired {
			cfg, err := auth.LoadConfig(cfgDir)
			if err != nil {
				return fmt.Errorf("failed to load config: %w", err)
			}

			secret := cfg.GetTOTPSecret(profileID)
			if secret == "" {
				fmt.Println("Session state: 2fa_required")
				fmt.Println("No TOTP secret configured. Please enter 2FA code manually in the browser.")
				fmt.Printf("To configure: add TOTP secret to %s\n", auth.ConfigPath(cfgDir))
				return nil
			}

			fmt.Println("Generating 2FA code...")
			code, err := auth.GenerateTOTP(secret)
			if err != nil {
				return fmt.Errorf("failed to generate 2FA code: %w", err)
			}

			// Get the current page to enter 2FA
			pages, err := result.Browser.Pages()
			if err != nil {
				return fmt.Errorf("failed to get browser pages: %w", err)
			}
			page := pages.First()
			if page == nil {
				return fmt.Errorf("no pages available for 2FA entry")
			}

			fmt.Println("Entering 2FA code...")
			if err := auth.Enter2FACode(page, code); err != nil {
				return fmt.Errorf("failed to enter 2FA code: %w", err)
			}

			// Re-check state after 2FA
			state, err = auth.CheckSessionState(result.Browser)
			if err != nil {
				return fmt.Errorf("failed to verify session after 2FA: %w", err)
			}
		}

		fmt.Printf("Session state: %s\n", state)

		if state == auth.StateLoggedIn {
			fmt.Println("Successfully logged in to Facebook.")
		}

		return nil
	},
}

func init() {
	authCmd.AddCommand(authLoginCmd)
}
