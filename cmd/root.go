package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var adspowerURL string

var rootCmd = &cobra.Command{
	Use:   "mega_facebook",
	Short: "Facebook automation tool with AdsPower browser management",
}

func init() {
	rootCmd.PersistentFlags().StringVar(&adspowerURL, "adspower-url", "", "AdsPower Local API URL (default http://localhost:50151)")
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
