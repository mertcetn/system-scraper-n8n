# PC Price Tracker for Discord

An n8n automation that checks prebuilt PC prices from Turkish retailers every hour, stores price history, and sends Discord alerts when a matching system drops in price.

[English](./README.md) | [Türkçe](./README_TR.md)

## How it works

1. Fetch product listings from six retailers.
2. Extract product names, components, prices, URLs, and stock status.
3. Apply the tracking filters configured through Discord.
4. Compare prices with the previous scan and update price history.
5. Send qualifying price drops to a Discord channel or the filter owner's DM.

For example, track systems containing `5060` and receive an alert when the price drops by at least 5%. Matching distinguishes `5060` from `5060 Ti` and `5060 Super`.

Out-of-stock products do not trigger alerts. A substantial product-name change resets the comparison baseline to avoid treating a different product as a price drop.

## Price history graphs

Each `/ara` result has a numbered **Bilgi** button. Click it to open a public graph message, initially showing **1 week**. Use the **1 Hafta / 1 Ay / 1 Yıl / Max** buttons beneath the graph to switch periods in the same message. Everyone who can see the message can change its selected period.

| Graph | Stored price points |
| --- | --- |
| 1 week | The lowest in-stock price for each day |
| 1 month | The lowest in-stock price for each week |
| 1 year | The lowest in-stock price for each month |
| Max | All recorded monthly minimum prices |

Each graph shows the period's lowest price and the day it was observed underneath the plot. Repeated observations retain only the minimum; ties retain the earliest observation date. Dates use Europe/Istanbul, and weeks start on Monday. Missing observations remain gaps.

Charts use a turquoise price line. Szum controls its theme appearance; the verified output has a light background, while QuickChart and the local fallback use dark styling. Only one graph is displayed at a time, and the active period button is highlighted. Images use **Szum → QuickChart → local PNG**, in that order. Any failure, including timeouts, quota limits, HTTP errors, or invalid PNGs, moves to the next option. Each external request has an 8-second timeout and no automatic retry. The local fallback uses embedded antialiased Segoe UI glyphs and needs no font installation or GPU.

History starts from actual recorded observations. Existing products can be initialized from their latest saved price and timestamp; earlier prices cannot be reconstructed. External services receive the selected period's public price points and minimum-price/date caption, without Discord user information, filters, or credentials in the payload. Empty history skips both services.

[Szum Free](https://szum.io/chart-image-api) includes 500 renders per month. QuickChart works without an API key; an [official community reply from April 2025](https://community.quickchart.io/t/rate-limits-for-quickchart-free-plan/722) lists 60 images/minute and 1,000/month. These historical QuickChart figures are not a guaranteed allowance. Limits or outages automatically fall through to local rendering.

## Supported retailers

| Retailer | Extraction method |
| --- | --- |
| Gaming.gen.tr | WooCommerce HTML and component lists |
| GameGaraj | Product cards and JSON-LD |
| İtopya | Category HTML fetched with `?pg=40` |
| PcKolik | Embedded Next.js data |
| Vatan Bilgisayar | Paginated category HTML |
| MediaMarkt | JSON-LD ItemList |

Listing structures and product counts can change. Historical scan results are documented in [IMPLEMENTATION.md](./IMPLEMENTATION.md); they are not guarantees of current coverage.

## Discord commands

Command names and option names remain in Turkish.

| Command | Purpose |
| --- | --- |
| `/filtre-ekle` | Add a filter. Options: `dahil`, `haric`, `min_fiyat`, `max_fiyat`, `esik_yuzde`, `site`, `dm`. Omit `dahil` to track all systems within the other limits. |
| `/filtre-listele` | List active tracking filters. |
| `/filtre-sil` | Delete a filter by ID. |
| `/esik-guncelle` | Change a filter's price-drop threshold. |
| `/ara` | Search in-stock systems with optional `model`, `site`, and `siralama` fields. Choose **En ucuz** (lowest first, default) or **En pahalı** (highest first). |
| `/debug` | Configure scan reports for a channel. Enable `verbose` to include product listings. |

Search results and verbose debug lists support button navigation with 10 products per page. Search pagination preserves the model, retailer, and sorting choice. Long display names are shortened while product links are retained.

Examples: `/ara model:5060`, `/ara model:5060 siralama:En pahalı`, or `/ara model:5060 eskiler:true`.

By default, `/ara` shows only systems observed within the last **72 hours**, based on `last_checked_at`; exactly 72 hours is included. Set the optional boolean **`eskiler:true`** to include older records as well. Missing or invalid observation timestamps are hidden by default and included with this option. Stock, model, retailer, and sorting rules still apply. Pagination preserves this choice, and stored products/history are never deleted by this filter. Debug reports keep their existing behavior.

The Discord command definition is stored in [discord/ara.command.json](./discord/ara.command.json). Its optional `siralama` choices use `en_ucuz` and `en_pahali` as API values. When importing into another deployment, register this command with your Discord application as well.

Run `node tests/search-command.cjs` to verify search behavior against the exported workflow.

## Repository layout

```text
system-scraper-n8n/
├── workflows/
│   ├── donanim-fiyat-takipcisi.json
│   ├── discord-slash-komut-yoneticisi.json
│   ├── render-price-history-chart.json
│   ├── render-external-price-chart.json
│   └── initialize-price-graph-history.json
├── lib/                  # Shared history and local PNG rendering code
├── tests/                # Workflow and graph regression checks
├── AGENTS.md             # Contributor and AI agent rules
├── IMPLEMENTATION.md     # Architecture, parsing, and table schemas
├── README.md             # English overview and setup
└── README_TR.md          # Turkish documentation
```

## Setup

### 1. Import the workflows

In n8n, create a workflow and choose **Import from File** for each JSON file in [workflows/](./workflows/):

- `donanim-fiyat-takipcisi.json`: scheduled scraping, price comparison, and notifications.
- `discord-slash-komut-yoneticisi.json`: Discord interactions, filter management, and graph information buttons.
- `render-price-history-chart.json`: public PNG endpoint used by Discord to display graphs.
- `render-external-price-chart.json`: reusable Szum/QuickChart renderer called by the public endpoint.
- `initialize-price-graph-history.json`: optional manual initialization of missing graph history from existing prices. It has no schedule and sends no alerts.

Keep the workflows inactive until configuration and manual checks are complete.

Create an n8n **Bearer Auth** credential named `Szum API`, put your Szum key in its Bearer Token field, and select it on `Render With Szum` in the external renderer. A local `.env` entry named `SZUM_KEY` does not automatically configure n8n credentials. QuickChart requires no credential. In the main renderer's `Render External Chart` node, select the imported external workflow; imported workflow and credential IDs must be rebound. Publish the external renderer first, then the main renderer after manual checks.

### 2. Create and connect the Data Tables

Create `tracking_filters`, `price_history`, and `debug_config` using the column definitions in [IMPLEMENTATION.md](./IMPLEMENTATION.md#data-tables). Select your own tables in the imported Data Table nodes; IDs from another n8n instance are not portable.

For an existing installation, add the string column `chart_history` to `price_history`. Activate the renderer workflow and replace `YOUR_PRICE_CHART_ENDPOINT` in `Format Graph Info` with its verified production URL. The static webhook path is `/webhook/price-history-chart`; check it with an HTTP request after import. Run the initialization workflow once if you want to seed missing graphs from existing observations. It changes only `chart_history` and skips rows that are already initialized. Monthly history is retained indefinitely, so monitor Data Table storage as the catalog grows.

### 3. Configure Discord

- Configure the bot token through n8n credentials. Never paste a real token into a workflow export or commit it.
- Supply the Discord application public key for interaction signature verification through a secure configuration mechanism.
- Configure the default notification channel ID.
- Register the slash commands on your Discord application and set its Interactions Endpoint URL to the deployed interactions webhook.

Exports use `YOUR_DISCORD_BOT_TOKEN`, `YOUR_DISCORD_PUBLIC_KEY`, and `YOUR_DISCORD_NOTIFICATION_CHANNEL_ID` as placeholders. Review every reference before activation; token placeholders must be replaced with credential-backed authentication.

### 4. Verify before activation

Run a manual scan and inspect product output, stock status, filter matches, and price history. Check both matching and excluded models, and confirm that changed products or unavailable stock cannot generate false alerts. Test Discord interaction verification and notification delivery before enabling the hourly schedule.

## Maintenance and security

Respect retailer robots.txt rules and avoid unnecessary requests. Stop and report bot-protection blocks instead of attempting to bypass them. Make parsing failures visible through debug reporting.

Keep tokens, webhook secrets, and local configuration out of Git. After changing a live project workflow, export its latest version to `workflows/` and check it for secrets before committing.

See [AGENTS.md](./AGENTS.md) for contribution rules and [IMPLEMENTATION.md](./IMPLEMENTATION.md) for technical details.

Regression checks:

```sh
node tests/search-command.cjs
node tests/price-graphs.cjs
node tests/chart-png.cjs
node tests/graph-workflows.cjs
node tests/chart-providers.cjs
```

To measure local rendering cost, run `node --expose-gc scripts/benchmark-chart.cjs` (20 samples per period) or add `--single` for a fresh-process measurement. These measurements do not include the n8n server's own process, task runner, or database overhead.
