# Workspace-operation UI contract

The preview-shell workspace owner exposes one operation state to the viewer
chrome. The viewer chrome supplies stable element hooks only; it does not infer
workspace state.

## Required rendered states

| State | Primary control | Secondary control | Persistent text |
|---|---|---|---|
| Idle | Open folder… | None | Folders are opened for this local browser address. |
| Opening | Opening folder… (busy) | None | Waiting for folder selection. |
| Cancelled | Open folder… | Retry | No folder was opened. |
| Active | Open another folder… | Forget current folder when applicable | `<count>` diagrams loaded from `<label>`. |
| Permission needed | Open folder… | Reconnect `<label>` | Permission is needed to restore `<label>`. |
| Failed | Open folder… | Retry | Specific safe failure reason and next action. |

## Navigation result

After successful registration, the next rendered viewer document MUST contain a
Browse group named after the workspace before the Bundled examples group. A
failed or cancelled operation MUST NOT create that group.

## Accessibility

- Status updates use the existing live-status region.
- Pending state exposes busy/disabled semantics without removing the control.
- Recovery actions have labels that identify the affected folder where known.
