# Data model: Folder Workspace Reliability

## Folder operation state

| Field | Meaning | Valid values |
|---|---|---|
| operation | User action in progress or most recently completed | open, restore, reconnect, forget |
| phase | Visible lifecycle state | idle, pending, cancelled, succeeded, recoverable, failed |
| workspace label | Human-readable folder name when known | non-empty label or absent |
| reason | User-safe explanation | browser unsupported, permission needed, invalid folder, registration failure, local-address scope, cancelled |
| action | Next available user action | open folder, reconnect folder, retry, none |

## Workspace availability

| State | Sidebar result | User-facing result |
|---|---|---|
| Active | Named group above Bundled examples | Success status and navigable diagrams |
| Restoring | Existing group pending re-registration | Visible restoring state |
| Permission needed | No active group until recovery succeeds | Adjacent reconnect action and reason |
| No remembered folder | Bundled examples only | Idle helper explaining how to open a folder and local-address scope |
| Invalid or failed | No partial group | Persistent failure reason and retry path |
