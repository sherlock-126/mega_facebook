package cmd

import (
	"fmt"

	"github.com/sherlock-126/mega_facebook/internal/adspower"
	"github.com/sherlock-126/mega_facebook/internal/auth"
	"github.com/sherlock-126/mega_facebook/internal/browser"
	"github.com/spf13/cobra"
)

var authStatusCmd = &cobra.Command{
	Use:   "status <profile_id>",
	Short: "Check Facebook session status for an AdsPower profile",
	Long: `Open an AdsPower browser profile, navigate to Facebook,
and report the current session state: logged_in, logged_out,
checkpoint, or 2fa_required.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		profileID := args[0]

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

		// Check session state
		fmt.Println("Checking Facebook session...")
		state, err := auth.CheckSessionState(result.Browser)
		if err != nil {
			return err
		}

		fmt.Printf("Session state: %s\n", state)
		return nil
	},
}

func init() {
	authCmd.AddCommand(authStatusCmd)
}
