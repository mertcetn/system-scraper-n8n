# Agent instructions

This file defines project rules, architectural principles, and working boundaries for AI agents. See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for workflow details, data models, and implementation notes.

## Project overview

This n8n automation periodically scans prebuilt PC prices from Turkish retailers, including Gaming.gen.tr, GameGaraj, İtopya, PcKolik, Vatan Bilgisayar, and MediaMarkt. It sends Discord channel or DM notifications when a system matching a user's filters drops in price.

Example: "Track systems with a 5060 and notify me when the price drops by 5%."

These retailers do not provide a general public API for this project. Data is extracted from embedded JSON, Next.js data, JSON-LD, or page HTML.

## Architecture

- **Execution and scheduling:** n8n workflows handle scheduling, fetching, parsing, comparison, and notifications.
- **Extraction priority:** Prefer embedded structured data, then HTML parsing. Browser automation is a last resort.
- **Dynamic management:** Discord slash commands add, remove, list, and update tracking filters.
- **Persistence:** Store filters and price history in n8n Data Tables.

## Security and privacy

- **Never expose secrets:** Tokens, webhook URLs, API keys, Discord public keys, and private credentials must not appear in workflow JSON files, the Git repository, or logs.
- **Untrusted input:** Sanitize and constrain Discord command parameters.
- **Git protection:** Keep `bilgiler.txt`, `.env`, `.agents/`, and any file containing tokens ignored by Git. Never push them to a remote repository.

## Working rules

1. **Verify before assuming:** Inspect real HTTP responses before relying on page structures or field names. State clearly when verification is unavailable.
2. **Scrape respectfully:** Add delays where needed, avoid redundant pagination, and obey robots.txt. Do not request multiple pages when one response already contains the complete listing.
3. **Respect bot protection:** Stop and report Cloudflare or other bot-protection blocks. Do not attempt to bypass them or pressure the site; suggest alternatives.
4. **Make failures visible:** Report parsing failures, including unexpected zero-product results, through debug notifications and error paths.
5. **Keep alerts accurate:** Products with `in_stock: false` must not trigger price-drop alerts. Never fabricate a price drop.
6. **Handle live changes carefully:** Verify workflow changes in a test environment or manual execution. Do not delete user filters or price history without asking.
7. **Keep documentation current:** New features, commands, retailers, parameters, or data models must be reflected in `README.md`, `README_TR.md`, and `IMPLEMENTATION.md` where relevant. Development is incomplete if its documentation is missing or outdated.
8. **Obtain feedback before committing:** Explain code, workflow, and documentation changes to the user and wait for feedback or approval before creating a Git commit. Do not commit without user feedback or approval.
9. **Export n8n changes before committing:** Before every Git commit, check whether this project's workflows have changed in n8n. If so, export the latest versions of the affected workflows to `./workflows/`. Verify that the exports contain no secrets and include them with the relevant changes. Do not commit before the required exports are complete.
10. **Review Git history at the start of every chat:** Before beginning project work, review recent commit messages and relevant diffs to understand the latest project state.

## Completion criteria

Apply the runtime checks below when the task changes the corresponding behavior.

1. Demonstrate real-site extraction using execution output.
2. Test positive and negative filter cases, such as matching `5060` while excluding `5060 Ti`.
3. Verify that invalid or changed products do not generate false price-drop alerts.
4. Ensure that files and exported workflows contain no secrets.
5. Document new features and architectural changes in [IMPLEMENTATION.md](./IMPLEMENTATION.md), [README.md](./README.md), and [README_TR.md](./README_TR.md).
6. Present changes to the user and obtain feedback or approval before committing.
7. If workflows changed in n8n, save current exports to `./workflows/` and verify that they contain no secrets.
