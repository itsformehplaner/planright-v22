
'use strict';

// v3 - Force DB recreation and fix recurring task logic

const DB_NAME = 'planright-db-v2';
const DB_VERSION = 1; 
const TASK_STORE_NAME = 'tasks';
const SETTINGS_STORE_NAME = 'settings';

let db = null;
let notificationTimer = null;

async function openDB() {
    if (db) return db;

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const dbInstance = request.result;
            if (!dbInstance.objectStoreNames.contains(TASK_STORE_NAME)) {
                dbInstance.createObjectStore(TASK_STORE_NAME, { keyPath: 'id' });
            }
            if (!dbInstance.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
                dbInstance.createObjectStore(SETTINGS_STORE_NAME, { keyPath: 'key' });
            }
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onerror = () => {
            console.error('Error opening IndexedDB:', request.error);
            reject(request.error);
        };
    });
}

async function getSetting(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SETTINGS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(SETTINGS_STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => reject(request.error);
    });
}

async function setSetting(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SETTINGS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(SETTINGS_STORE_NAME);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getTasks() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([TASK_STORE_NAME], 'readonly');
        const store = transaction.objectStore(TASK_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveTasks(tasks) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([TASK_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(TASK_STORE_NAME);
        store.clear();
        tasks.forEach(task => store.put(task));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

async function updateSingleTask(task) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([TASK_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(TASK_STORE_NAME);
        const request = store.put(task);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function deleteSingleTask(taskId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([TASK_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(TASK_STORE_NAME);
        const request = store.delete(taskId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function getNextDueDate(task) {
    if (!task.recurrence || !task.dueDate) return null;
    const { frequency, interval, endDate } = task.recurrence;
    let nextDate = new Date(task.dueDate);

    switch (frequency) {
        case 'daily': nextDate.setDate(nextDate.getDate() + interval); break;
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7 * interval); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + interval); break;
        case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + interval); break;
        default: return null;
    }

    if (endDate && nextDate > new Date(endDate)) {
        return null;
    }
    return nextDate;
}

async function checkTasksForNotifications() {
    try {
        const now = new Date();
        const leadTime = await getSetting('leadTime') || 0;
        const lastChecked = await getSetting('lastChecked') || now.getTime();
        
        const tasks = await getTasks();
        if (!tasks) return;

        for (const task of tasks) {
            if (task.status !== 'active' && task.status !== 'in-progress') {
                if (!task.recurrence) {
                     await deleteSingleTask(task.id);
                }
                continue;
            }

            if (!task.dueDate) continue;

            const dueDate = new Date(task.dueDate);
            const notificationTime = new Date(dueDate.getTime() - leadTime);
            
            if (notificationTime <= now && notificationTime > new Date(lastChecked)) {
                self.registration.showNotification(task.title, {
                    body: task.description || `Due now`,
                    icon: '/icons/icon-192x192.png',
                });

                if (task.recurrence) {
                    const nextDueDate = getNextDueDate(task);
                    if (nextDueDate) {
                        task.dueDate = nextDueDate.toISOString();
                        await updateSingleTask(task);
                    } else {
                        await deleteSingleTask(task.id);
                    }
                } else {
                    await deleteSingleTask(task.id);
                }
            }
        }
        await setSetting('lastChecked', now.getTime());
    } catch (error) {
        console.error('Error checking notifications:', error);
    }
}


function manageTimer() {
    getSetting('notificationsEnabled').then(enabled => {
        if (enabled) {
            if (!notificationTimer) {
                checkTasksForNotifications(); // Run once immediately
                notificationTimer = setInterval(checkTasksForNotifications, 60000); // Check every minute
            }
        } else {
            if (notificationTimer) {
                clearInterval(notificationTimer);
                notificationTimer = null;
            }
        }
    });
}

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim().then(() => {
        // After activation, ensure the DB is open and the timer state is correct.
        openDB().then(manageTimer);
    }));
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'UPDATE_TASKS':
                saveTasks(event.data.payload.tasks)
                    .then(() => setSetting('leadTime', event.data.payload.leadTime))
                    .then(() => event.ports[0].postMessage({ success: true }))
                    .catch(err => event.ports[0].postMessage({ error: err.message }));
                break;
            case 'SET_NOTIFICATIONS_ENABLED':
                setSetting('notificationsEnabled', event.data.payload)
                    .then(() => {
                        manageTimer();
                        event.ports[0].postMessage({ success: true, enabled: event.data.payload });
                    })
                    .catch(err => event.ports[0].postMessage({ error: err.message }));
                break;
            case 'GET_NOTIFICATION_STATE':
                 getSetting('notificationsEnabled')
                    .then(enabled => event.ports[0].postMessage({ enabled: !!enabled }))
                    .catch(err => event.ports[0].postMessage({ error: err.message }));
                break;
            case 'CLEAR_TASKS':
                saveTasks([])
                    .then(() => event.ports[0].postMessage({ success: true }))
                    .catch(err => event.ports[0].postMessage({ error: err.message }));
                break;
        }
    }
});
