package cmd

import (
	"fmt"

	"github.com/sherlock-126/mega_facebook/internal/adspower"
	"github.com/sherlock-126/mega_facebook/internal/auth"
	"github.com/sherlock-126/mega_facebook/internal/browser"
	"github.com/spf13/cobra"
)

var authExportCmd = &cobra.Command{
	Use:   "export <profile_id>",
	Short: "Export Facebook cookies from an AdsPower profile to a JSON file",
	Long: `Connect to an AdsPower browser profile, extract all Facebook
cookies, and save them to a JSON file for later import.`,
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

		// Extract cookies
		fmt.Println("Extracting Facebook cookies...")
		cookies, err := auth.ExtractCookies(result.Browser)
		if err != nil {
			return err
		}

		if len(cookies) == 0 {
			fmt.Println("No Facebook cookies found in browser.")
			return nil
		}

		// Save to file
		cookiePath := auth.CookiePath(cfgDir, profileID)
		if err := auth.WriteCookieFile(cookiePath, cookies); err != nil {
			return err
		}

		fmt.Printf("Exported %d cookies to %s\n", len(cookies), cookiePath)
		return nil
	},
}

func init() {
	authCmd.AddCommand(authExportCmd)
}
