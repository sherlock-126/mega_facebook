package cmd

import (
	"fmt"

	"github.com/sherlock-126/mega_facebook/internal/adspower"
	"github.com/spf13/cobra"
)

var profileOpenCmd = &cobra.Command{
	Use:   "open <profile_id>",
	Short: "Open/start an AdsPower browser profile",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client := adspower.NewClient(adspowerURL)

		data, err := client.OpenProfile(args[0])
		if err != nil {
			return err
		}

		fmt.Printf("Profile started successfully.\n")
		fmt.Printf("Debug port: %s\n", data.DebugPort)
		fmt.Printf("Puppeteer WS: %s\n", data.WS.Puppeteer)
		fmt.Printf("Selenium WS:  %s\n", data.WS.Selenium)
		return nil
	},
}

func init() {
	profileCmd.AddCommand(profileOpenCmd)
}
