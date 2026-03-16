package warmup

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/sherlock-126/mega_facebook/internal/browser"
	"github.com/sherlock-126/mega_facebook/internal/humanize"
	"github.com/sherlock-126/mega_facebook/internal/ratelimit"
	"github.com/sherlock-126/mega_facebook/internal/selectors"
)

// executor performs Facebook actions using browser automation.
type executor struct {
	auto    *browser.Automation
	limiter *ratelimit.Limiter
}

// browseFeed navigates to Facebook and scrolls through the feed.
// This is a passive action that doesn't count against rate limits.
func (e *executor) browseFeed(profileID string) error {
	slog.Info("browsing feed", "profile", profileID)

	if err := e.auto.Navigate("https://www.facebook.com/"); err != nil {
		return fmt.Errorf("failed to navigate to feed: %w", err)
	}

	// Scroll down 3-5 times to simulate reading the feed.
	scrollCount := 3 + randIntn(3)
	for i := 0; i < scrollCount; i++ {
		pixels := 300 + randIntn(400)
		page := e.auto.Page()
		if err := page.Mouse.Scroll(0, float64(pixels), 0); err != nil {
			slog.Warn("scroll failed", "error", err)
			break
		}
		delay := humanize.RandomDelay(2000, 5000)
		time.Sleep(delay)
	}

	slog.Info("feed browsed", "profile", profileID, "scrolls", scrollCount)
	return nil
}

// likePosts finds and clicks Like buttons on posts in the feed.
// Returns the number of posts liked.
func (e *executor) likePosts(profileID string, count int) (int, error) {
	slog.Info("liking posts", "profile", profileID, "target", count)

	if err := e.auto.Navigate("https://www.facebook.com/"); err != nil {
		return 0, fmt.Errorf("failed to navigate to feed: %w", err)
	}

	liked := 0
	for i := 0; i < count; i++ {
		allowed, err := e.limiter.Allow(profileID, ratelimit.ActionPageLike)
		if err != nil {
			return liked, fmt.Errorf("rate limit check failed: %w", err)
		}
		if !allowed {
			slog.Info("page_like rate limit reached", "profile", profileID, "liked", liked)
			break
		}

		// Scroll down to find more posts.
		page := e.auto.Page()
		if err := page.Mouse.Scroll(0, float64(200+randIntn(300)), 0); err != nil {
			slog.Warn("scroll failed", "error", err)
		}
		time.Sleep(humanize.RandomDelay(1000, 2000))

		// Try to find a Like button.
		el, err := e.auto.FindByText("Like", "span")
		if err != nil {
			slog.Warn("no Like button found, scrolling more", "attempt", i+1)
			if scrollErr := page.Mouse.Scroll(0, float64(400+randIntn(300)), 0); scrollErr != nil {
				slog.Warn("scroll failed", "error", scrollErr)
			}
			time.Sleep(humanize.RandomDelay(1500, 3000))
			continue
		}

		if err := el.Click("left", 1); err != nil {
			slog.Warn("failed to click Like button", "error", err)
			continue
		}

		liked++
		slog.Info("liked post", "profile", profileID, "count", liked)
		time.Sleep(humanize.ClickDelay())
	}

	return liked, nil
}

// sendFriendRequests navigates to friend suggestions and sends friend requests.
// Returns the number of requests sent.
func (e *executor) sendFriendRequests(profileID string, count int) (int, error) {
	slog.Info("sending friend requests", "profile", profileID, "target", count)

	if err := e.auto.Navigate("https://www.facebook.com/friends/suggestions"); err != nil {
		return 0, fmt.Errorf("failed to navigate to friend suggestions: %w", err)
	}

	sent := 0
	for i := 0; i < count; i++ {
		allowed, err := e.limiter.Allow(profileID, ratelimit.ActionFriendRequest)
		if err != nil {
			return sent, fmt.Errorf("rate limit check failed: %w", err)
		}
		if !allowed {
			slog.Info("friend_request rate limit reached", "profile", profileID, "sent", sent)
			break
		}

		// Find "Add friend" button using selectors.
		for _, sel := range selectors.FriendSuggestion {
			el, findErr := e.auto.WaitForElement(sel, 5*time.Second)
			if findErr != nil {
				continue
			}

			if clickErr := el.Click("left", 1); clickErr != nil {
				slog.Warn("failed to click Add Friend", "error", clickErr)
				continue
			}

			sent++
			slog.Info("friend request sent", "profile", profileID, "count", sent)
			time.Sleep(humanize.ClickDelay())
			break
		}

		// Scroll to find more suggestions.
		page := e.auto.Page()
		if scrollErr := page.Mouse.Scroll(0, float64(300+randIntn(200)), 0); scrollErr != nil {
			slog.Warn("scroll failed", "error", scrollErr)
		}
		time.Sleep(humanize.RandomDelay(1500, 3000))
	}

	return sent, nil
}

// joinGroups navigates to group suggestions and joins groups.
// Returns the number of groups joined.
func (e *executor) joinGroups(profileID string, count int) (int, error) {
	slog.Info("joining groups", "profile", profileID, "target", count)

	if err := e.auto.Navigate("https://www.facebook.com/groups/discover"); err != nil {
		return 0, fmt.Errorf("failed to navigate to group suggestions: %w", err)
	}

	joined := 0
	for i := 0; i < count; i++ {
		allowed, err := e.limiter.Allow(profileID, ratelimit.ActionGroupJoin)
		if err != nil {
			return joined, fmt.Errorf("rate limit check failed: %w", err)
		}
		if !allowed {
			slog.Info("group_join rate limit reached", "profile", profileID, "joined", joined)
			break
		}

		// Find "Join" button using selectors.
		for _, sel := range selectors.GroupSuggestion {
			el, findErr := e.auto.WaitForElement(sel, 5*time.Second)
			if findErr != nil {
				continue
			}

			if clickErr := el.Click("left", 1); clickErr != nil {
				slog.Warn("failed to click Join Group", "error", clickErr)
				continue
			}

			joined++
			slog.Info("group joined", "profile", profileID, "count", joined)
			time.Sleep(humanize.ClickDelay())
			break
		}

		// Scroll to find more groups.
		page := e.auto.Page()
		if scrollErr := page.Mouse.Scroll(0, float64(300+randIntn(200)), 0); scrollErr != nil {
			slog.Warn("scroll failed", "error", scrollErr)
		}
		time.Sleep(humanize.RandomDelay(1500, 3000))
	}

	return joined, nil
}

// postContent navigates to the user's profile and creates a post.
// Returns 1 if a post was created, 0 otherwise.
func (e *executor) postContent(profileID string) (int, error) {
	slog.Info("posting content", "profile", profileID)

	allowed, err := e.limiter.Allow(profileID, ratelimit.ActionPost)
	if err != nil {
		return 0, fmt.Errorf("rate limit check failed: %w", err)
	}
	if !allowed {
		slog.Info("post rate limit reached", "profile", profileID)
		return 0, nil
	}

	if err := e.auto.Navigate("https://www.facebook.com/"); err != nil {
		return 0, fmt.Errorf("failed to navigate to feed: %w", err)
	}

	// Click the post composer ("What's on your mind?").
	composerClicked := false
	for _, sel := range selectors.PostComposer {
		if clickErr := e.auto.Click(sel); clickErr == nil {
			composerClicked = true
			break
		}
	}
	if !composerClicked {
		// Try text-based fallback.
		el, findErr := e.auto.FindByText("What's on your mind", "span")
		if findErr != nil {
			slog.Warn("post composer not found", "profile", profileID)
			return 0, nil
		}
		if clickErr := el.Click("left", 1); clickErr != nil {
			slog.Warn("failed to click post composer", "error", clickErr)
			return 0, nil
		}
	}

	time.Sleep(humanize.RandomDelay(1000, 2000))

	// Select random content and type it.
	content := warmupPosts[randIntn(len(warmupPosts))]

	// Find the post text area and type content.
	typed := false
	for _, sel := range selectors.PostTextArea {
		if typeErr := e.auto.Type(sel, content); typeErr == nil {
			typed = true
			break
		}
	}
	if !typed {
		slog.Warn("could not type in post composer", "profile", profileID)
		return 0, nil
	}

	time.Sleep(humanize.RandomDelay(1000, 2000))

	// Click the Post button.
	el, err := e.auto.FindByText("Post", "span")
	if err != nil {
		slog.Warn("Post button not found", "profile", profileID)
		return 0, nil
	}
	if err := el.Click("left", 1); err != nil {
		slog.Warn("failed to click Post button", "error", err)
		return 0, nil
	}

	time.Sleep(humanize.PageLoadDelay())
	slog.Info("post created", "profile", profileID)
	return 1, nil
}

// warmupPosts is a list of generic post content used during warm-up.
// Kept simple and non-promotional to avoid triggering spam filters.
var warmupPosts = []string{
	"Having a great day! 😊",
	"Beautiful weather today ☀️",
	"Hope everyone is doing well!",
	"Good morning everyone! 🌅",
	"Enjoying the weekend 🎉",
	"What a wonderful day!",
	"Life is good 🙂",
	"Happy to be here!",
	"Feeling grateful today ❤️",
	"Hello world! 👋",
}
