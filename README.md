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

Examples: `/ara model:5060` or `/ara model:5060 siralama:En pahalı`.

The Discord command definition is stored in [discord/ara.command.json](./discord/ara.command.json). Its optional `siralama` choices use `en_ucuz` and `en_pahali` as API values. When importing into another deployment, register this command with your Discord application as well.

Run `node tests/search-command.cjs` to verify search behavior against the exported workflow.

## Repository layout

```text
system-scraper-n8n/
├── workflows/
│   ├── donanim-fiyat-takipcisi.json
│   └── discord-slash-komut-yoneticisi.json
├── AGENTS.md             # Contributor and AI agent rules
├── IMPLEMENTATION.md     # Architecture, parsing, and table schemas
├── README.md             # English overview and setup
└── README_TR.md          # Turkish documentation
```

## Setup

### 1. Import the workflows

In n8n, create a workflow and choose **Import from File** for each JSON file in [workflows/](./workflows/):

- `donanim-fiyat-takipcisi.json`: scheduled scraping, price comparison, and notifications.
- `discord-slash-komut-yoneticisi.json`: Discord interactions and filter management.

Keep the workflows inactive until configuration and manual checks are complete.

### 2. Create and connect the Data Tables

Create `tracking_filters`, `price_history`, and `debug_config` using the column definitions in [IMPLEMENTATION.md](./IMPLEMENTATION.md#data-tables). Select your own tables in the imported Data Table nodes; IDs from another n8n instance are not portable.

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
