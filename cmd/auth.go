package cmd

import "github.com/spf13/cobra"

var configDir string

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Manage Facebook authentication for AdsPower profiles",
}

func init() {
	profileCmd.AddCommand(authCmd)
	authCmd.PersistentFlags().StringVar(&configDir, "config-dir", "", "Configuration directory (default ~/.mega_facebook)")
}
