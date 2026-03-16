package cmd

import (
	"fmt"

	"github.com/sherlock-126/mega_facebook/internal/adspower"
	"github.com/sherlock-126/mega_facebook/internal/auth"
	"github.com/sherlock-126/mega_facebook/internal/browser"
	"github.com/spf13/cobra"
)

var authImportCmd = &cobra.Command{
	Use:   "import <profile_id> <cookie_file>",
	Short: "Import cookies from a JSON file into an AdsPower profile",
	Long: `Read Facebook cookies from a JSON file and inject them into
an AdsPower browser profile. After injection, navigates to Facebook
to verify login status.`,
	Args: cobra.ExactArgs(2),
	RunE: func(cmd *cobra.Command, args []string) error {
		profileID := args[0]
		cookieFile := args[1]

		// Parse cookie file
		cookies, err := auth.ParseCookieFile(cookieFile)
		if err != nil {
			return err
		}

		// Filter to Facebook cookies only
		fbCookies, skipped := auth.FilterFacebookCookies(cookies)
		if len(fbCookies) == 0 {
			return fmt.Errorf("no Facebook cookies found in %s", cookieFile)
		}
		if skipped > 0 {
			fmt.Printf("Skipped %d non-Facebook cookies.\n", skipped)
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

		// Inject cookies
		fmt.Printf("Injecting %d Facebook cookies...\n", len(fbCookies))
		if err := auth.InjectCookies(result.Browser, fbCookies); err != nil {
			return err
		}

		// Verify login state
		fmt.Println("Verifying login status...")
		state, err := auth.CheckSessionState(result.Browser)
		if err != nil {
			return fmt.Errorf("cookies imported but failed to verify login: %w", err)
		}

		fmt.Printf("Session state: %s\n", state)
		return nil
	},
}

func init() {
	authCmd.AddCommand(authImportCmd)
}
