import { uploadImage, validateImage } from './images';

export function validateArtwork(file: Pick<File, 'type' | 'size'>): string | null {
	return validateImage(file, 'Poster');
}

export function uploadArtwork(file: File, onProgress: (percent: number) => void): Promise<string> {
	return uploadImage(file, onProgress, 'Poster');
}
