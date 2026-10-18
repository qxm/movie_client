export function validateArtwork(file: Pick<File, 'type' | 'size'>): string | null {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Please select a JPEG, PNG or WebP image.';
    if (file.size === 0 || file.size > 5 * 1024 * 1024) return 'Poster must be non-empty and 5 MB or smaller.';
    return null;
}

export function uploadArtwork(file: File, onProgress: (percent: number) => void): Promise<string> {
    const error = validateArtwork(file);
    if (error) return Promise.reject(new Error(error));
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/artworks');
        xhr.timeout = 120_000;
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
        };
        xhr.onerror = () => reject(new Error('Poster upload failed. Check your connection and retry.'));
        xhr.ontimeout = () => reject(new Error('Poster upload timed out. Please retry.'));
        xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new Error(`Poster upload failed (${xhr.status}). Please retry.`));
                return;
            }
            try {
                const data = JSON.parse(xhr.responseText);
                if (typeof data.url !== 'string' || !data.url.startsWith('/api/artworks/')) {
                    throw new Error('Poster upload returned an invalid URL.');
                }
                resolve(data.url);
            } catch {
                reject(new Error('Poster upload returned an invalid response.'));
            }
        };
        const body = new FormData();
        body.append('file', file);
        xhr.send(body);
    });
}
