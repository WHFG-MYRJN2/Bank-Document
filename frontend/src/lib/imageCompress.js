import imageCompression from "browser-image-compression";

export async function compressImage(file) {
    // Target: max 1920px side, ~0.78 quality JPEG
    try {
        const opts = {
            maxSizeMB: 1.2,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            initialQuality: 0.78,
            fileType: "image/jpeg",
        };
        const out = await imageCompression(file, opts);
        return out;
    } catch (e) {
        console.warn("compress failed, using original", e);
        return file;
    }
}
