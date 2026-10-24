# mc-keepalive-hermes

Keeps a free-tier Minecraft server (mcserverhost.com `free` sleep policy) from being
powered off for being idle, by keeping one real player session online.

## Why

Free servers get their container powered off by the platform sweep after ~5 minutes with
`connections = 0`. Everything running inside that container dies with it. The join attempt
also is what wakes a sleeping server — the status ping literally answers
`Asleep — join to start the server`.

So: a bot connects, joins, and stays. `GET /portal/servers/<uuid>/sleep` then shows
`connections >= 1` and the sweep never fires.

## How it runs

GitHub Actions, public repo (no minute quota), job holds the session for 5h30m and is
scheduled every 5h with a `concurrency` group so runs overlap instead of leaving a gap.

| file | what |
|---|---|
| `bot.js` | mineflayer bot: auto-detect version, offline auth, 45s idle motion, infinite reconnect (60s backoff when the server is booting/queued) |
| `.github/workflows/keepalive.yml` | cron `0 */5 * * *` + manual dispatch, timeout 350 min |

Manual run: Actions → keepalive → Run workflow. Boot/queue waits are normal — the log will
show `kicked: Your server is queued to start — position N` until the node has capacity.

## Server prerequisite

The bot has to log in without a Microsoft account, so the server runs with
`online-mode=false`. Set in `server.properties` via the panel file manager.

Rollback: set `online-mode=true` again and restart. While offline mode is on, anyone who
knows the address can join under any name — turn on `white-list=true` + `whitelist.json`
if the address is shared.
