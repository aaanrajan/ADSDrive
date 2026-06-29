const cron = require('node-cron');
const isOnline = require('is-online').default; // or just require('is-online') for old versions
const SqliteService = require('./sqlite-service');
const sqliteService= SqliteService(); // assuming sqliteService is defined in another file
const configService = require('./config-service');
// const configService = ConfigService();
const SyncService = require('./sync-service');
const syncService = SyncService(); // assuming syncService is defined in another file

const SYNC_SETTINGS_KEYS = {
  LAST_UPLOAD_SYNC_TIME: "LAST_UPLOAD_SYNC_TIME",
  LAST_DOWNLOAD_META_SYNC_TIME: "LAST_DOWNLOAD_META_SYNC_TIME"
};

function SyncScheduler() {
  let isSyncPaused = false;
  let offlineCheckInterval = null;
  let config = configService.loadConfig();
  
  configService.on(() => {
        config = configService.loadConfig(); // pull fresh config when needed
  });

  // -----------------------------
  // Pause / Resume
  // -----------------------------
  function pauseSync() {
    isSyncPaused = true;
    console.log('⏸️ Sync paused');
  }

  function resumeSync() {
    isSyncPaused = false;
    console.log('▶️ Sync resumed');
  }

  // -----------------------------
  // Check missed syncs
  // -----------------------------
  async function checkMissedSync() {
    // const config = configService.loadConfig();
    if (!config || config.syncFrequency.toUpperCase() === 'REALTIME' || isSyncPaused) return;

    const online = await isOnline();
    if (!online) return;

    const lastSyncStr = await sqliteService.getSetting(SYNC_SETTINGS_KEYS.LAST_UPLOAD_SYNC_TIME);
    const now = new Date();

    if (!lastSyncStr) {
      console.log('🔔 No sync recorded yet. Performing first-time sync.');
      await syncService.performSync();
      await sqliteService.setSetting(SYNC_SETTINGS_KEYS.LAST_UPLOAD_SYNC_TIME, now.toISOString());
      return;
    }

    const lastSync = new Date(lastSyncStr);
    const freq = config.syncFrequency.toUpperCase();

    if (freq === 'HOURLY') {
      const diffMins = Math.floor((now.getTime() - lastSync.getTime()) / 60000);
      if (diffMins >= 60) {
        console.log('🔁 Missed HOURLY sync. Performing catch-up.');
        await syncService.performSync();
        await sqliteService.setSetting(SYNC_SETTINGS_KEYS.LAST_UPLOAD_SYNC_TIME, now.toISOString());
      }
    }

    if (freq === 'DAILY') {
      if (lastSync.toDateString() !== now.toDateString()) {
        console.log('📆 Missed DAILY sync. Performing catch-up.');
        await syncService.performSync();
        await sqliteService.setSetting(SYNC_SETTINGS_KEYS.LAST_UPLOAD_SYNC_TIME, now.toISOString());
      }
    }
  }

  // -----------------------------
  // Periodic offline check
  // -----------------------------
  function startOfflineCheck() {
    offlineCheckInterval = setInterval(async () => {
      // const config = configService.loadConfig();
      if (!config || config.syncFrequency.toUpperCase() === 'REALTIME' || isSyncPaused) return;

      await checkMissedSync();
    }, 5 * 60 * 1000); // every 5 minutes
  }

  // -----------------------------
  // Cron Jobs
  // -----------------------------
  async function startCronJobs() {
    // const config = configService.loadConfig();
    if (!config) return;

    const frequency = config?.syncFrequency?.toUpperCase();

    if (frequency === 'HOURLY') {
      cron.schedule('0 * * * *', async () => {
        const online = await isOnline();
        if (!online || isSyncPaused) return console.log('⏸️ HOURLY sync skipped (offline or paused)');
        console.log('🕐 HOURLY sync started');
        await syncService.performSync();
        await sqliteService.setSetting(SYNC_SETTINGS_KEYS.LAST_UPLOAD_SYNC_TIME, new Date().toISOString());
      });
    }

    if (frequency === 'DAILY') {
      cron.schedule('0 14 * * *', async () => {
        const online = await isOnline();
        if (!online || isSyncPaused) return console.log('⏸️ DAILY sync skipped (offline or paused)');
        console.log('📅 DAILY sync started');
        await syncService.performSync();
        await sqliteService.setSetting(SYNC_SETTINGS_KEYS.LAST_UPLOAD_SYNC_TIME, new Date().toISOString());
      });
    }

    if (frequency === 'REALTIME') {
      cron.schedule('*/1 * * * *', async () => {
        const online = await isOnline();
        if (!online || isSyncPaused) return console.log('⏸️ REALTIME sync skipped (offline or paused)');
        console.log('⚡ REALTIME sync (every 5 min)');
        await syncService.performSync();
        await sqliteService.setSetting(SYNC_SETTINGS_KEYS.LAST_UPLOAD_SYNC_TIME, new Date().toISOString());
      });
    }

    console.log('✅ Cron jobs initialized for frequency:', frequency);
  }

  // -----------------------------
  // Cleanup
  // -----------------------------
  function stop() {
    if (offlineCheckInterval) {
      clearInterval(offlineCheckInterval);
      offlineCheckInterval = null;
    }
  }

  // Start background offline check immediately
  startOfflineCheck();

  return {
    pauseSync,
    resumeSync,
    startCronJobs,
    stop
  };
}

module.exports = { SyncScheduler, SYNC_SETTINGS_KEYS };
