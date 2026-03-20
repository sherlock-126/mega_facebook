package cmd

import (
	"fmt"

	"github.com/sherlock-126/mega_facebook/internal/adspower"
	"github.com/sherlock-126/mega_facebook/internal/auth"
	"github.com/sherlock-126/mega_facebook/internal/browser"
	"github.com/sherlock-126/mega_facebook/internal/ratelimit"
	"github.com/sherlock-126/mega_facebook/internal/warmup"
	"github.com/spf13/cobra"
)

var dryRun bool

var warmupCmd = &cobra.Command{
	Use:   "warmup",
	Short: "Account warm-up workflow commands",
}

var warmupRunCmd = &cobra.Command{
	Use:   "run <profile_id>",
	Short: "Run a warm-up session for a Facebook profile",
	Long: `Execute one warm-up session for the given AdsPower profile.
The warm-up workflow gradually increases activity over 4 phases:
  Phase 1 (days 1-3):  Browse feed, like 2-3 posts
  Phase 2 (days 4-7):  Add 2-3 friends, join 1-2 groups
  Phase 3 (days 8-14): 5-10 friend requests/day, post content
  Phase 4 (days 15+):  Ramp to target activity levels

Progress is tracked per profile and persists between runs.`,
	Args: cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		profileID := args[0]

		cfgDir := configDir
		if cfgDir == "" {
			cfgDir = auth.DefaultConfigDir()
		}

		// Create rate limiter and warm-up manager.
		limiter, err := ratelimit.New(cfgDir)
		if err != nil {
			return fmt.Errorf("failed to create rate limiter: %w", err)
		}

		mgr, err := warmup.NewManager(cfgDir, limiter)
		if err != nil {
			return fmt.Errorf("failed to create warm-up manager: %w", err)
		}

		// Show current status.
		status, err := mgr.Status(profileID)
		if err != nil {
			return err
		}
		fmt.Println(status)

		// Handle dry-run mode.
		if dryRun {
			plan, planErr := mgr.PlanSession(profileID)
			if planErr != nil {
				// If warm-up not started yet, show phase 1 plan.
				fmt.Println("\nDry run — warm-up not started yet, showing Phase 1 plan:")
				phase := warmup.GetPhase(1)
				for _, ac := range phase.Actions {
					fmt.Printf("  %s: %d-%d per day\n", ac.Type, ac.MinPerDay, ac.MaxPerDay)
				}
				return nil
			}

			fmt.Println("\nDry run — planned actions for this session:")
			for action, count := range plan {
				fmt.Printf("  %s: %d\n", action, count)
			}
			return nil
		}

		// Open AdsPower profile.
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

		// Connect browser.
		fmt.Println("Connecting to browser...")
		result, err := browser.Connect(wsURL)
		if err != nil {
			return err
		}
		defer result.Browser.Close()

		// Create stealth page and automation.
		page, err := browser.StealthPage(result.Browser)
		if err != nil {
			return fmt.Errorf("failed to create stealth page: %w", err)
		}

		auto, err := browser.NewAutomation(page)
		if err != nil {
			return fmt.Errorf("failed to create automation: %w", err)
		}

		// Run warm-up session.
		fmt.Println("Running warm-up session...")
		session, err := mgr.RunSession(profileID, auto)
		if err != nil {
			return fmt.Errorf("warm-up session failed: %w", err)
		}

		// Print results.
		fmt.Printf("\nSession complete (Phase %d):\n", session.Phase)
		for action, count := range session.Actions {
			fmt.Printf("  %s: %d\n", action, count)
		}

		// Show updated status.
		status, err = mgr.Status(profileID)
		if err != nil {
			return err
		}
		fmt.Println("\n" + status)

		return nil
	},
}

var warmupStatusCmd = &cobra.Command{
	Use:   "status <profile_id>",
	Short: "Show warm-up progress for a profile",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		profileID := args[0]

		cfgDir := configDir
		if cfgDir == "" {
			cfgDir = auth.DefaultConfigDir()
		}

		limiter, err := ratelimit.New(cfgDir)
		if err != nil {
			return err
		}

		mgr, err := warmup.NewManager(cfgDir, limiter)
		if err != nil {
			return err
		}

		status, err := mgr.Status(profileID)
		if err != nil {
			return err
		}
		fmt.Println(status)
		return nil
	},
}

func init() {
	warmupRunCmd.Flags().BoolVar(&dryRun, "dry-run", false, "Show planned actions without executing")
	warmupCmd.AddCommand(warmupRunCmd)
	warmupCmd.AddCommand(warmupStatusCmd)
	rootCmd.AddCommand(warmupCmd)
}
