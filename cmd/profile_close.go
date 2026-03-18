package cmd

import (
	"fmt"

	"github.com/sherlock-126/mega_facebook/internal/adspower"
	"github.com/spf13/cobra"
)

var profileCloseCmd = &cobra.Command{
	Use:   "close <profile_id>",
	Short: "Close/stop an AdsPower browser profile",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		client := adspower.NewClient(adspowerURL)

		if err := client.CloseProfile(args[0]); err != nil {
			return err
		}

		fmt.Println("Profile closed successfully.")
		return nil
	},
}

func init() {
	profileCmd.AddCommand(profileCloseCmd)
}
