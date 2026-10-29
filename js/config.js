// Address of the transfer-key sync server (worker/). Filled in by tools/deploy-sync.sh.
// localStorage "michi.syncUrl" overrides it for local testing against `wrangler dev`.
export const SYNC_URL = localStorage.getItem('michi.syncUrl') || 'https://michi-sync.jacobsekai.workers.dev';
