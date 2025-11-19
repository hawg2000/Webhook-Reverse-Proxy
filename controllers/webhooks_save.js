const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * controllers/webhooks_save.js
 *
 * Simple controller to create, update and delete "adapters" stored in a JSON file.
 * Exports async functions: listAdapters, getAdapter, createAdapter, updateAdapter, deleteAdapter
 *
 * Usage:
 *   const webhooks = require('./controllers/webhooks_save');
 *   await webhooks.createAdapter({ name: 'my-adapter', config: {...} });
 */


const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'adapters.json');
const TEMP_FILE = path.join(DATA_DIR, 'adapters.json.tmp');

function generateId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return crypto.randomBytes(16).toString('hex');
}

async function ensureDataFile() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        try {
            await fs.access(DATA_FILE);
        } catch {
            await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
        }
    } catch (err) {
        throw new Error('Failed to ensure data file: ' + err.message);
    }
}

async function readAdapters() {
    await ensureDataFile();
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        // if corrupted, reset to empty list
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
        return [];
    }
}

async function writeAdapters(adapters) {
    const text = JSON.stringify(adapters, null, 2);
    // atomic write: write temp file then rename
    await fs.writeFile(TEMP_FILE, text, 'utf8');
    await fs.rename(TEMP_FILE, DATA_FILE);
}

async function listAdapters() {
    return await readAdapters();
}

async function getAdapter(id) {
    if (!id) return null;

    const key = String(id)
        .trim()
        .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars entfernen
        .toLowerCase();

    const adapters = await readAdapters();

    // 1) Direkte ID suchen
    let found = adapters.find(a => 
        String(a.id).toLowerCase() === key
    );
    if (found) return found;

    // 2) Falls jemand die URL statt der ID übergeben hat:
    found = adapters.find(a => {
        if (!a.url) return false;
        const lastPart = a.url.split("/").pop(); // ID am Ende der URL
        return String(lastPart).toLowerCase() === key;
    });

    return found || null;
}


async function createAdapter(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload for createAdapter');
    }
    const adapters = await readAdapters();
    const now = new Date().toISOString();
    const adapter = {
        id: generateId(),
        url: 'http://api.yp-it.de/api/webhook/' + generateId(),
        createdAt: now,
        updatedAt: now,
        ...payload
    };
    adapters.push(adapter);
    await writeAdapters(adapters);
    return adapter;
}

async function updateAdapter(id, updates) {
    if (!id) throw new Error('id is required for updateAdapter');
    if (!updates || typeof updates !== 'object') {
        throw new Error('Invalid updates for updateAdapter');
    }
    const adapters = await readAdapters();
    const idx = adapters.findIndex(a => a.id === id);
    if (idx === -1) return null;
    const updated = {
        ...adapters[idx],
        ...updates,
        id: adapters[idx].id, // prevent id change
        createdAt: adapters[idx].createdAt,
        updatedAt: new Date().toISOString()
    };
    adapters[idx] = updated;
    await writeAdapters(adapters);
    return updated;
}

async function deleteAdapter(id) {
    if (!id) throw new Error('id is required for deleteAdapter');
    const adapters = await readAdapters();
    const idx = adapters.findIndex(a => a.id === id);
    if (idx === -1) return false;
    adapters.splice(idx, 1);
    await writeAdapters(adapters);
    return true;
}

module.exports = {
    listAdapters,
    readAdapters,
    getAdapter,
    createAdapter,
    updateAdapter,
    deleteAdapter
};