# ADR-001: Facebook Automation Research & Roadmap Refinement

- **Status:** Accepted
- **Date:** 2026-03-16
- **Authors:** mega_facebook team

## Context

The mega_facebook project is a Go CLI application for Facebook automation built on AdsPower (anti-detect browser) + go-rod (CDP automation) + Cobra (CLI framework). The foundation is in place: AdsPower API integration, browser connection via puppeteer WebSocket URLs, and Facebook authentication (cookie-based sessions, TOTP 2FA, session state detection).

Before implementing automation features (posting, commenting, scraping, friend requests, group management), we need to understand:
1. What features exist in the ecosystem and which are most valuable
2. How to avoid Facebook detection and account bans
3. What failure modes to expect and design around
4. Which Go libraries to adopt for the remaining stack

This ADR documents comprehensive research findings to guide the implementation roadmap.

---

## Decision

### 1. Repository Landscape Analysis

We analyzed 12+ notable Facebook automation/scraping repositories on GitHub. The ecosystem is predominantly Python-based; mega_facebook's Go + AdsPower approach is unique in open source.

#### 1.1 Scraping & Data Extraction

| Repository | Stars | Language | Key Features | Architecture |
|---|---|---|---|---|
| kevinzg/facebook-scraper | ~3,100 | Python | Scrape public pages without API key; posts, comments, reactions, photos; pagination | HTTP + HTML parsing (no browser) |
| harismuneer/Ultimate-Social-Scrapers | ~3,000 | Python | Posts, photos, videos, friends list, profile photos | Selenium (headful Chrome) |
| shaikhsajid1111/facebook_page_scraper | ~262 | Python | Pages and groups; JSON/CSV output; proxy support; headless mode | Selenium WebDriver |
| n0kovo/fb_friend_list_scraper | ~310 | Python | OSINT tool; friend lists; rate-limit evasion; headless | Selenium with sleep multipliers |
| passivebot/facebook-marketplace-scraper | ~200+ | Python | Marketplace listings; city/query/price filters; Streamlit GUI | Playwright + BeautifulSoup |

#### 1.2 Post & Group Automation

| Repository | Stars | Language | Key Features | Architecture |
|---|---|---|---|---|
| adar2/Facebook-Posts-Automation | ~179 | Python | Post to groups/pages; group member scraping; scheduled posts; PyQt5 GUI | Selenium + SQLite3 |
| warifp/FacebookToolkit | ~1,100 | PHP | Multi-tool: data extraction, bots, account utilities | PHP + cURL (HTTP-based) |

#### 1.3 Messenger Automation

| Repository | Stars | Language | Key Features | Architecture |
|---|---|---|---|---|
| fbchat-dev/fbchat | ~1,100+ | Python | Messages with files/stickers; thread fetch; search; group management; real-time listening; 2FA | Reverse-engineered HTTP API |
| tulir/fbchat-asyncio | ~50+ | Python | Async fork of fbchat; used in Matrix bridge integrations | Async HTTP (aiohttp) |

#### 1.4 SDKs & Anti-Detection

| Repository | Stars | Language | Key Features | Architecture |
|---|---|---|---|---|
| mobolic/facebook-sdk | ~2,700+ | Python | Graph API SDK; OAuth; page management; posting via API | Official Graph API wrapper |
| facebook/facebook-python-business-sdk | ~1,200+ | Python | Meta Marketing/Ads API; campaigns; analytics | Official Meta Marketing API |
| go-rod/stealth | ~200+ | Go | Anti-bot-detection plugin for go-rod; fingerprinting bypass | go-rod plugin (CDP-based) |

#### 1.5 Key Feature Distribution

| Category | Prevalence | Most Common Features |
|---|---|---|
| **Data Extraction** | Very High | Public page/group post scraping, profile scraping, marketplace listings, friend lists |
| **Content Automation** | High | Auto-posting to groups/pages, scheduled posts, auto-commenting, reactions |
| **Messaging** | Medium | Send/receive messages, real-time listening, group chat management, auto-reply bots |
| **Social Automation** | Medium | Group joining, friend list extraction, group member scraping, auto-invites |
| **Account Management** | Medium-Low | Cookie-based sessions, multi-account, anti-detect browser integration, proxy rotation |

#### 1.6 Architecture Approaches Compared

| Approach | Pros | Cons | Facebook Resilience |
|---|---|---|---|
| HTTP + HTML parsing | Fast, lightweight | Breaks on UI changes; public data only | Low |
| Selenium WebDriver | Full UI interaction; JS rendering | Slow, resource-heavy, easily detected | Low |
| Playwright | Modern API, auto-wait, multi-browser | Still detectable without anti-fingerprinting | Medium |
| CDP via go-rod/Puppeteer | Direct CDP; fast; stealth plugins available | More complex setup | Medium-High |
| **Anti-detect browser + CDP** | Best anti-detection; real fingerprints; multi-account safe | Requires commercial tool | **High** |
| Official Graph API | Legitimate, stable, documented | Very limited scope (only your own pages/ads) | N/A |

**Conclusion:** mega_facebook's AdsPower + go-rod approach is the most robust for sustained Facebook automation. Very few open-source projects take this approach, giving us a significant advantage.

---

### 2. Anti-Detection & Stealth Techniques

#### 2.1 Browser Fingerprinting Evasion

| Technique | Description | Recommendation for mega_facebook |
|---|---|---|
| **Canvas fingerprint** | Inject subtle noise so hash is unique per profile but consistent within session | Handled by AdsPower per-profile; go-rod/stealth provides additional coverage |
| **WebGL fingerprint** | Override WEBGL_debug_renderer_info with plausible GPU profiles matching declared OS/UA | Handled by AdsPower |
| **Navigator properties** | Patch navigator.webdriver, plugins, languages, platform, hardwareConcurrency, deviceMemory | go-rod/stealth patches these; AdsPower provides profile-level values |
| **Screen/timezone** | Match resolution, timezone, locale to proxy's geographic location | AdsPower auto-matches per profile |
| **WebRTC leak prevention** | Block or relay WebRTC to prevent real IP exposure | AdsPower handles per-profile |
| **TLS fingerprinting** | JA3/JA4 hash must match declared browser for any direct HTTP requests | Use refraction-networking/utls if making direct HTTP requests |

**Key rule:** go-rod/stealth is necessary but not sufficient alone. It must be combined with AdsPower's profile-level fingerprinting for reliable Facebook operation.

#### 2.2 Behavioral Anti-Detection

These patterns must be implemented in mega_facebook's automation logic:

| Behavior | Implementation |
|---|---|
| **Random delays** | 800-2500ms between clicks, 1500-4000ms between page loads. Never use fixed intervals. |
| **Mouse movement** | Bezier-curve trajectories between click targets. Include overshoots and micro-corrections. Move to element before clicking. |
| **Scroll patterns** | Variable-speed scrolling with pauses (simulating reading). Occasional scroll-past and scroll-back. |
| **Typing speed** | 50-150ms per character with random variance. Simulate occasional typos + backspace. Pauses between words (200-600ms). |
| **Session duration** | 15-45 minute sessions with occasional longer sessions. Include natural offline periods. |
| **Activity scheduling** | Post during target audience's active hours. Vary daily start times by +/- 30-60 minutes. Include rest days. |

#### 2.3 Network-Level Stealth

| Strategy | Details |
|---|---|
| **Sticky sessions** | Same IP for entire session — Facebook flags mid-session IP changes |
| **Per-profile IPs** | Each AdsPower profile gets its own dedicated proxy. Never share IPs across accounts. |
| **Residential/mobile proxies** | Required for account management. Mobile proxies are most trusted (CGNAT). Datacenter proxies are easily flagged. |
| **IP warming** | Browse normally on new proxy before automation. Maintain IP-account affinity. |
| **Cookie isolation** | Never share cookies/localStorage across profiles — this cross-links accounts. |

---

### 3. Facebook Detection Vectors & Failure Points

#### 3.1 Checkpoint Types

| Checkpoint | Description | Automatable? |
|---|---|---|
| SMS/email code | Enter code sent to phone/email | Partially (with API access to SMS/email) |
| Photo verification | Select photos of tagged friends | No |
| Video selfie | Record front-camera following instructions | No |
| Friend identification | Identify friends from photos | No |
| Identity document | Upload government ID | No |
| Birthday verification | Confirm date of birth | Yes (if stored) |
| CAPTCHA / "Is this you?" | Standard challenge-response | Partially (CAPTCHA services) |
| Trusted contacts | Code from designated friend | No |
| Browser verification | Log in from recognized device | Yes (with persistent sessions) |

**Key insight:** Most checkpoint types cannot be automated. The strategy must be **avoidance** (not triggering them) rather than recovery. When checkpoints occur, flag for manual intervention within 30 days (after which the account is permanently locked).

#### 3.2 Rate Limits (Approximate Ranges)

| Action | Safe Daily Limit | Maximum | Notes |
|---|---|---|---|
| Friend requests sent | 20-25 | ~50 | New accounts: 5-10/day |
| Friend requests accepted | ~20 | 30-40 | Exceeding triggers 48h block |
| Messages (non-friends) | 3-5 | ~150 burst | Triggers checkpoints quickly |
| Posts | 5-6 | ~25 | Start at 2-3/week for new accounts |
| Page likes/follows | 15-20 | ~5,000 | |
| Comments | Varies | Varies | Spam filters on repetitive content |
| Group joins | 5-10 | ~25 | Ramp from 1-2/day over weeks |
| Group invites | ~25 | ~50 | |
| API actions (total) | — | 4,800/24h | Shared across managed pages |

**These limits vary significantly by account trust level.** Aged, verified accounts with organic activity history have higher thresholds than new accounts.

#### 3.3 Ban Trigger Behaviors

- Sudden scale-up in any action type
- Repetitive identical content (same message/comment text)
- Login from unusual locations or rapid device changes
- Multiple accounts from same IP/fingerprint
- Actions faster than humanly possible
- Accessing too many profiles rapidly
- Identical behavioral patterns across multiple accounts

#### 3.4 Account Warm-Up Strategy

| Phase | Duration | Activities |
|---|---|---|
| **Phase 1** | Days 1-3 | Log in, browse feed, like 2-3 posts, update profile photo/bio |
| **Phase 2** | Days 4-7 | Add 2-3 friends, join 1-2 groups, comment on friends' posts |
| **Phase 3** | Days 8-14 | 5-10 friend requests/day, post original content, engage in groups |
| **Phase 4** | Days 15-30 | Gradually ramp to target activity levels |

#### 3.5 Common Technical Failures

| Failure | Cause | Mitigation |
|---|---|---|
| **Selector breakage** | Facebook updates UI; React generates hashed class names | Use aria-label, data-testid, role attributes, or text content matching instead of class names |
| **SPA navigation** | URL changes via History API without page loads | Wait for component rendering, not page loads. Use go-rod's WaitStable/WaitLoad. |
| **Lazy loading** | Elements not in DOM until scrolled into view | Scroll to element location before querying |
| **Session expiration** | Cookies invalidated on suspicious activity | Persist cookies; validate session before each run; re-import on failure |
| **Checkpoint loops** | Re-triggered even after verification | Cool down account for 24-48h after checkpoint resolution |

---

### 4. Go Library Recommendations

#### 4.1 Already Adopted (Keep)

| Library | Purpose | Status |
|---|---|---|
| github.com/go-rod/rod | Browser automation via CDP | Core dependency |
| github.com/spf13/cobra | CLI framework | Core dependency |
| github.com/pquerna/otp | TOTP 2FA generation | Used in auth package |

#### 4.2 Recommended Additions

| Library | Purpose | Priority | Justification |
|---|---|---|---|
| **github.com/go-rod/stealth** | Anti-bot-detection for go-rod | **P0** | Patches navigator.webdriver and other automation markers. Essential for Facebook. |
| **github.com/uber-go/ratelimit** | Action rate limiting | **P1** | Enforce safe action intervals (e.g., max 20 friend requests/day). Leaky-bucket algorithm. |
| **github.com/huandu/facebook** | Facebook Graph API client | **P2** | Most popular Go FB SDK. Useful for Graph API interactions (page management, posting via API). |
| **github.com/refraction-networking/utls** | TLS fingerprint spoofing | **P2** | Mimic browser JA3/JA4 hashes for any direct HTTP requests to Facebook outside the browser. |
| **github.com/go-resty/resty** | HTTP client | **P3** | Cleaner API than net/http for webhook/API integrations. Not critical. |

#### 4.3 Not Recommended

| Library | Reason |
|---|---|
| chromedp | More verbose than go-rod, less performant, harder iframe handling. go-rod is already adopted. |
| playwright-go | Requires Playwright server process; harder to integrate with AdsPower's managed browsers. |
| colly | Web scraping framework — not needed since we use browser automation via AdsPower. |

---

### 5. Refined Feature Roadmap

Based on research findings, prioritized by value and implementation complexity:

#### Phase 1: Foundation Hardening (Current)
- [x] AdsPower Local API Integration
- [x] Browser connection via CDP/go-rod
- [x] Facebook Authentication (cookies, TOTP, session detection)
- [ ] **Integrate go-rod/stealth** — P0, essential anti-detection layer
- [ ] **Rate limiter middleware** — P1, prevent accidental ban triggers

#### Phase 2: Core Automation
- [ ] **Feed interaction** — Like, react, comment on feed posts with human-like delays
- [ ] **Auto-posting** — Post to own timeline, pages, and groups with content templates and scheduling
- [ ] **Friend request automation** — Send/accept friend requests with daily limits and warm-up logic

#### Phase 3: Data Extraction
- [ ] **Feed scraping** — Extract posts from feed, pages, and groups with pagination
- [ ] **Profile scraping** — Extract public profile information
- [ ] **Group member extraction** — List members of joined groups

#### Phase 4: Advanced Automation
- [ ] **Group automation** — Join/leave groups, post to multiple groups with rotation
- [ ] **Marketplace automation** — List/search marketplace items
- [ ] **Messenger automation** — Send/receive messages (complex, high ban risk)

#### Phase 5: Account Management at Scale
- [ ] **Account warm-up workflow** — Automated graduated activity ramp over 2-4 weeks
- [ ] **Multi-account orchestration** — Run actions across multiple profiles with proxy rotation
- [ ] **Health monitoring** — Detect checkpoints, rate limit warnings, and account status across all profiles

---

## Consequences

### Positive
- **Validated architecture:** AdsPower + go-rod is the most robust approach in the ecosystem. No open-source project in Go takes this approach, giving us a unique position.
- **Clear anti-detection strategy:** Combining AdsPower fingerprinting, go-rod/stealth, behavioral randomization, and residential proxies provides layered defense against detection.
- **Informed rate limits:** Documented thresholds prevent developers from accidentally triggering bans.
- **Prioritized roadmap:** Features ordered by value and risk level, with foundation hardening before automation features.

### Negative
- **Research has a shelf life:** Facebook updates detection methods regularly. This ADR should be reviewed quarterly and updated with new findings.
- **Rate limits are approximate:** Real thresholds vary by account trust level and change without notice. Must be configurable, not hardcoded.
- **Most checkpoints are unautomatable:** The strategy must focus on avoidance. Account loss is an accepted risk for aggressive automation.

### Risks
- Facebook may introduce new detection vectors that bypass AdsPower's fingerprinting.
- go-rod/stealth may lag behind new anti-bot techniques; monitor for updates.
- Rate limit thresholds may tighten, requiring more conservative defaults.

---

## References

### GitHub Repositories Analyzed
- [kevinzg/facebook-scraper](https://github.com/kevinzg/facebook-scraper) — Python, ~3.1k stars
- [harismuneer/Ultimate-Social-Scrapers](https://github.com/harismuneer/Ultimate-Social-Scrapers) — Python, ~3k stars
- [shaikhsajid1111/facebook_page_scraper](https://github.com/shaikhsajid1111/facebook_page_scraper) — Python, ~262 stars
- [n0kovo/fb_friend_list_scraper](https://github.com/n0kovo/fb_friend_list_scraper) — Python, ~310 stars
- [passivebot/facebook-marketplace-scraper](https://github.com/passivebot/facebook-marketplace-scraper) — Python, ~200+ stars
- [adar2/Facebook-Posts-Automation](https://github.com/adar2/Facebook-Posts-Automation) — Python, ~179 stars
- [warifp/FacebookToolkit](https://github.com/warifp/FacebookToolkit) — PHP, ~1.1k stars
- [fbchat-dev/fbchat](https://github.com/fbchat-dev/fbchat) — Python, ~1.1k+ stars
- [tulir/fbchat-asyncio](https://github.com/tulir/fbchat-asyncio) — Python, ~50+ stars
- [mobolic/facebook-sdk](https://github.com/mobolic/facebook-sdk) — Python, ~2.7k+ stars
- [facebook/facebook-python-business-sdk](https://github.com/facebook/facebook-python-business-sdk) — Python, ~1.2k+ stars
- [go-rod/stealth](https://github.com/go-rod/stealth) — Go, ~200+ stars

### Go Libraries Referenced
- [go-rod/rod](https://github.com/go-rod/rod) — CDP browser automation
- [go-rod/stealth](https://github.com/go-rod/stealth) — Anti-detection plugin
- [huandu/facebook](https://github.com/huandu/facebook) — Go Facebook Graph API SDK
- [uber-go/ratelimit](https://github.com/uber-go/ratelimit) — Rate limiter
- [refraction-networking/utls](https://github.com/refraction-networking/utls) — TLS fingerprint spoofing
- [pquerna/otp](https://github.com/pquerna/otp) — TOTP/HOTP
- [go-resty/resty](https://github.com/go-resty/resty) — HTTP client

### Anti-Detection & Facebook Detection Sources
- Browser fingerprinting evasion techniques (soax.com, roundproxies.com, browsercat.com)
- Puppeteer stealth plugin analysis (latenode.com)
- Facebook account warm-up guides (multilogin.com, undetectable.io, adspower.com)
- Facebook rate limits and ban patterns (elfsight.com, publer.com, phantombuster.com)
- Anti-detect browser comparisons (multilogin.com)
- Facebook checkpoint types and recovery (dicloak.com, hidemyacc.com)
