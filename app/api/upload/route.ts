import { put, del, head } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;

        if (!file) {
            return NextResponse.json(
                { success: false, message: "Aucun fichier fourni." },
                { status: 400 }
            );
        }

        // Validation du type de fichier
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: "Type de fichier non autorisé. Utilisez JPG, PNG ou WEBP." },
                { status: 400 }
            );
        }

        // Validation de la taille (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, message: "Fichier trop volumineux. Maximum 5MB." },
                { status: 400 }
            );
        }

        // Générer un nom unique pour éviter les conflits
        const timestamp = Date.now();
        const safeName = file.name.replace(/\s/g, '-');
        const uniqueName = `${timestamp}-${safeName}`;

        console.log("Upload du fichier:", uniqueName); // Log pour déboguer

        // Upload vers Vercel Blob
        const blob = await put(uniqueName, file, {
            access: 'public',
        });

        console.log("Upload réussi:", blob.url);

        return NextResponse.json({ 
            success: true, 
            path: blob.url,
            message: "Fichier uploadé avec succès."
        });
        
    } catch (error) {
        console.error("Erreur upload:", error);
        return NextResponse.json(
            { 
                success: false, 
                message: "Erreur lors de l'upload du fichier.",
                error: error instanceof Error ? error.message : "Erreur inconnue"
            },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { path } = await request.json();
        
        if (!path) {
            return NextResponse.json(
                { success: false, message: "Chemin du fichier non fourni." },
                { status: 400 }
            );
        }

        console.log("Suppression du fichier:", path);

        // Vérifier si le fichier existe avant suppression
        try {
            await head(path);
        } catch {
            return NextResponse.json(
                { success: false, message: "Fichier non trouvé." },
                { status: 404 }
            );
        }

        // Supprimer du Vercel Blob
        await del(path);
        
        console.log("Suppression réussie:", path);
        
        return NextResponse.json(
            { success: true, message: "Fichier supprimé avec succès." },
            { status: 200 }
        );
        
    } catch (error) {
        console.error("Erreur suppression:", error);
        return NextResponse.json(
            { 
                success: false, 
                message: "Erreur lors de la suppression du fichier.",
                error: error instanceof Error ? error.message : "Erreur inconnue"
            },
            { status: 500 }
        );
    }
}