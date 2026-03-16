package cmd

import (
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/sherlock-126/mega_facebook/internal/adspower"
	"github.com/spf13/cobra"
)

var profileListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all AdsPower browser profiles",
	RunE: func(cmd *cobra.Command, args []string) error {
		client := adspower.NewClient(adspowerURL)

		profiles, err := client.ListProfiles()
		if err != nil {
			return err
		}

		if len(profiles) == 0 {
			fmt.Println("No profiles found.")
			return nil
		}

		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "USER_ID\tNAME\tSERIAL\tGROUP")
		for _, p := range profiles {
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", p.UserID, p.Name, p.SerialNumber, p.GroupID)
		}
		return w.Flush()
	},
}

func init() {
	profileCmd.AddCommand(profileListCmd)
}
