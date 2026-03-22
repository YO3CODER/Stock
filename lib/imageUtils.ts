export function getImageUrl(url: string | null | undefined): string {
    if (!url) return '/placeholder-image.jpg';
    
    // Si c'est une URL de Vercel Blob privé, passer par notre endpoint
    if (url.includes('vercel-storage.com') || url.includes('private.blob')) {
        return `/api/image/${encodeURIComponent(url)}`;
    }
    
    return url;
}