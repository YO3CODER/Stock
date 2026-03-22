import { getDownloadUrl } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string }> }
) {
    try {
        const { path } = await params;
        
        // Décoder le chemin (les caractères spéciaux comme / sont encodés)
        const decodedPath = decodeURIComponent(path);
        
        // Obtenir l'URL de téléchargement - UN SEUL ARGUMENT
        const url = await getDownloadUrl(decodedPath);
        
        // Récupérer l'image
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Image non trouvée');
        }
        
        const blob = await response.blob();
        
        // Retourner l'image avec les bons headers
        return new NextResponse(blob, {
            status: 200,
            headers: {
                'Content-Type': blob.type,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
        
    } catch (error) {
        console.error('Erreur image:', error);
        return new NextResponse('Image non trouvée', { status: 404 });
    }
}