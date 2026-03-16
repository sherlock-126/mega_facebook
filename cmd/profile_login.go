package cmd

import (
	"fmt"

	"github.com/sherlock-126/mega_facebook/internal/adspower"
	"github.com/sherlock-126/mega_facebook/internal/browser"
	"github.com/spf13/cobra"
)

var profileLoginCmd = &cobra.Command{
	Use:   "login <profile_id>",
	Short: "Check Facebook login status for an AdsPower profile",
	Long: `Open an AdsPower browser profile, connect to it via go-rod,
navigate to Facebook and check if the user is logged in.
If not logged in, the browser remains open for manual login.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		profileID := args[0]
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

		fmt.Printf("Connecting to browser via WebSocket...\n")
		result, err := browser.Connect(wsURL)
		if err != nil {
			return err
		}
		defer result.Browser.Close()

		fmt.Printf("Navigating to Facebook...\n")
		loggedIn, err := browser.CheckFacebookLogin(result.Browser)
		if err != nil {
			return err
		}

		if loggedIn {
			fmt.Println("Logged in to Facebook.")
		} else {
			fmt.Println("Not logged in. Please log in manually on the browser.")
		}

		return nil
	},
}

func init() {
	profileCmd.AddCommand(profileLoginCmd)
}
