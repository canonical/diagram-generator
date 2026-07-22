# Workspace-operation UI contract

The preview-shell workspace owner exposes one operation state to the viewer
chrome. The viewer chrome supplies stable element hooks only; it does not infer
workspace state.

## Required rendered states

| State | Primary control | Secondary control | Persistent text |
|---|---|---|---|
| Idle | Open folder… | None | Open a folder to edit its YAML diagrams. Folders are remembered for this local browser address. |
| Opening | Opening folder… (busy) | None | Waiting for folder selection. |
| Cancelled | Open folder… | Retry | No folder was opened. |
| Active | Open another folder… | Forget current folder when applicable | `<count>` diagrams loaded from `<label>`. |
| Permission needed | Open folder… | Reconnect `<label>` | Permission is needed to restore `<label>`. |
| Unsupported | Open folder… (unavailable) | None | This browser cannot open local folders. |
| Failed | Open folder… | Retry | Specific safe failure reason and next action. |

## Navigation result

After successful registration, the next rendered viewer document MUST contain a
Browse group named after the workspace before the Bundled examples group and an
Active message reconstructed from the registered folder. A failed or cancelled
operation MUST NOT create that group.

## Accessibility

- Folder-workspace updates use a dedicated live-status region structurally
  separate from the preview build status; `Ready` never communicates folder
  success.
- Pending state exposes busy/disabled semantics without removing the control.
- Recovery actions have labels that identify the affected folder where known.
