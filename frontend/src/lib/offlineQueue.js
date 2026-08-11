// Offline upload queue backed by localStorage (metadata only - files kept in memory during session)
// Simple retry loop when back online.
import { api } from "./api";

const KEY = "upload_queue_v1";

function readQueue() {
    try {
        return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
        return [];
    }
}
function writeQueue(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
}

// In-memory blob store (survives across pages but not reload)
const blobStore = new Map();

export function enqueue({ truckId, kategori, file }) {
    const id = `q_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    blobStore.set(id, file);
    const items = readQueue();
    items.push({
        id,
        truckId,
        kategori,
        filename: file.name,
        size: file.size,
        status: "pending",
        addedAt: new Date().toISOString(),
    });
    writeQueue(items);
    return id;
}

export function getQueueForTruck(truckId) {
    return readQueue().filter((i) => i.truckId === truckId);
}

export function getAllPending() {
    return readQueue().filter((i) => i.status !== "done");
}

export function remove(id) {
    const items = readQueue().filter((i) => i.id !== id);
    writeQueue(items);
    blobStore.delete(id);
}

export async function processQueue(onProgress) {
    const items = getAllPending();
    for (const item of items) {
        const blob = blobStore.get(item.id);
        if (!blob) {
            // File lost after reload - drop
            remove(item.id);
            continue;
        }
        try {
            const fd = new FormData();
            fd.append("kategori", item.kategori);
            fd.append(
                "file",
                blob,
                blob.name || `${item.kategori}_${Date.now()}.jpg`,
            );
            await api.post(`/trucks/${item.truckId}/photos`, fd, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (e) => {
                    if (onProgress && e.total) {
                        onProgress(item.id, Math.round((e.loaded / e.total) * 100));
                    }
                },
            });
            remove(item.id);
            if (onProgress) onProgress(item.id, 100, "done");
        } catch (e) {
            console.warn("queue item failed", item.id, e);
            if (onProgress) onProgress(item.id, 0, "failed");
        }
    }
}

// Auto-retry on reconnect
window.addEventListener("online", () => {
    setTimeout(() => processQueue(() => {}), 500);
});
