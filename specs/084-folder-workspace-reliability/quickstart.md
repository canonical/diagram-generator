# Validation quickstart

## Automated

```bash
npm --prefix apps/preview test
npm --prefix packages/layout-engine test
npm --prefix packages/layout-engine run build:browser
node scripts/check-browser-bundle-fresh.mjs
node scripts/check_no_new_python.mjs
```

## Real Chrome evidence

1. Start the feature-branch preview on one localhost address.
2. Open a valid test folder and verify its named Browse group appears above
   Bundled examples.
3. Cancel a second Open-folder attempt and verify the durable cancelled status.
4. Restart the preview and verify a granted folder restores automatically.
5. Revoke browser folder permission, reload, and verify adjacent recovery copy
   and action are visible.
6. Re-grant permission, verify the group returns, edit a diagram, save, and
   reload to verify the authored YAML persists.
7. Repeat on a different localhost port and verify the first-run/local-address
   guidance makes the required open action clear.

Record the browser/version, local address, test folder names, and visual result
in an evidence note before closeout.
