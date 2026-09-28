# Hermes Session Context Manager Design

## Goal

Build a standalone Python utility for Windows that prevents Hermes Agent sessions from repeatedly exceeding NVIDIA's approximate 40,000 TPM limit. The utility will analyze the most recent active Hermes session, estimate its outbound context footprint, prune old conversation history to below 20,000 estimated tokens, or archive and reset the active conversation lane.

## Authoritative Data Sources

Hermes stores canonical conversation messages in:

- `C:\Users\zaidb\AppData\Local\hermes\state.db`
- `C:\Users\zaidb\AppData\Local\hermes\sessions\sessions.json`

Files named `request_dump_*.json` are failed outbound request snapshots. They are useful for measuring the actual payload sent to NVIDIA, but modifying or moving them does not reset the active WhatsApp conversation.

## Commands

The script will expose these modes:

- `analyze`: report active/recent sessions, message counts, stored token counts, estimated prompt tokens, and the newest matching request dump.
- `prune`: automatically prune the selected active session until its estimated context is below 20,000 tokens.
- `reset`: export and archive the selected session, end the old SQLite session, remove its active `session_key` mapping, and allow Hermes to create a fresh session on the next WhatsApp message.
- `watch`: periodically analyze the active session and run `prune` when it exceeds the threshold.

`analyze` and `prune --dry-run` never write. `prune`, `reset`, and automatic `watch` writes require an explicit `--apply` option.

## Session Selection

By default, the utility will:

1. Read `sessions\sessions.json`.
2. Select the most recently updated active WhatsApp session.
3. Resolve its `session_id` in `state.db`.

It will also support explicit `--session-id` and `--session-key` arguments. It will refuse ambiguous destructive operations instead of guessing.

## Token Estimation

Priority order:

1. Use the newest matching `request_dump_<session_id>_*.json` and estimate tokens from its `request.body.messages`, tools, and other request fields.
2. Use stored `messages.token_count` values when available.
3. Fall back to a conservative local estimator based on serialized character length, with extra overhead per message and tool schema.

The report will clearly label values as API-derived, stored, or estimated. Exact tokenizer parity is not promised because NVIDIA's server tokenizer and tool-schema accounting are provider-specific.

## Pruning Rules

The utility will never modify the `sessions.system_prompt` column in `state.db`; Hermes injects the root system prompt and global skill/tool definitions separately when constructing requests.

For canonical message rows, pruning will:

1. Preserve the newest 10 user-led dialogue exchanges where possible, never fewer than 5 unless the retained payload still exceeds 20,000 tokens.
2. Preserve complete tool-call groups. An assistant message containing `tool_calls`, its corresponding tool responses, and the following assistant response are kept or removed together.
3. Preserve any initial system-role messages stored in the transcript.
4. Mark older rows as `active = 0` rather than deleting them.
5. Recalculate the session's active `message_count` and `tool_call_count`.
6. Re-estimate the retained payload before committing. If the target cannot be met while retaining five exchanges, abort without changes and recommend `reset`.

## Reset Rules

Reset will not delete the historical session. It will:

1. Export the session metadata and all active/inactive messages to a timestamped JSON archive.
2. Back up `sessions\sessions.json`.
3. Mark the old SQLite session ended with `end_reason = "context_manager_reset"`.
4. Remove only the matching active lane entry from `sessions\sessions.json`.
5. Leave the old `state.db` messages available for audit and future inspection.

The next WhatsApp message causes Hermes to generate a new session ID and empty conversation state.

## Locking And Recovery

SQLite writes will use a short connection timeout, `BEGIN IMMEDIATE`, bounded retries with exponential backoff, and rollback on every failure. JSON mapping changes will use a temporary file, `fsync`, and atomic `os.replace`.

Before every write, the utility will create:

- A SQLite online backup using `sqlite3.Connection.backup`.
- A timestamped copy of `sessions\sessions.json`.
- A JSON export of the target session.

If the gateway holds a write lock beyond the retry budget, the script exits without partial changes and instructs the operator to stop Hermes or retry later.

## Scheduled Task

The delivered instructions will register a Windows Task Scheduler job that runs:

```powershell
python.exe C:\path\to\hermes_session_manager.py prune --apply --threshold 20000
```

The recommended scheduled setup runs this one-shot command every five minutes as the current user, starts only when the user is logged in, and writes logs under the Hermes home directory. The `watch` mode remains available for an explicitly managed foreground or service process, but Task Scheduler will not launch overlapping watchers.

## Verification

Tests will use temporary SQLite databases and session mappings. They will cover:

- Active WhatsApp session selection.
- Request-dump and fallback token estimation.
- Preservation of system messages and recent exchanges.
- Preservation of assistant/tool-call groups.
- Dry-run behavior.
- Atomic prune and rollback behavior.
- Archive-and-reset behavior.
- Locked database retry failure without partial writes.

The real Hermes files will not be modified during automated tests.
