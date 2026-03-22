import { put, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        console.log("=== API upload appelée ===");
        
        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;

        if (!file) {
            console.log("Aucun fichier reçu");
            return NextResponse.json(
                { success: false, message: "Aucun fichier fourni." },
                { status: 400 }
            );
        }

        console.log("Fichier reçu:", file.name, file.size, file.type);

        // Validation du type de fichier
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            console.log("Type non autorisé:", file.type);
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

        // Générer un nom unique
        const timestamp = Date.now();
        const safeName = file.name.replace(/\s/g, '-');
        const uniqueName = `${timestamp}-${safeName}`;

        console.log("Upload vers Blob:", uniqueName);
        
        // Upload vers Vercel Blob - avec les 3 arguments requis
        const blob = await put(uniqueName, file, {
            access: 'public',
            addRandomSuffix: false,
        });

        console.log("Upload réussi, URL:", blob.url);

        return NextResponse.json({ 
            success: true, 
            path: blob.url,
            message: "Fichier uploadé avec succès."
        });
        
    } catch (error) {
        console.error("ERREUR DÉTAILLÉE:", error);
        return NextResponse.json(
            { 
                success: false, 
                message: "Erreur lors de l'upload",
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
                { success: false, message: "Chemin non fourni." },
                { status: 400 }
            );
        }

        console.log("Suppression du fichier:", path);
        
        await del(path);
        
        console.log("Suppression réussie");
        
        return NextResponse.json(
            { success: true, message: "Fichier supprimé avec succès." },
            { status: 200 }
        );
        
    } catch (error) {
        console.error("Erreur suppression:", error);
        return NextResponse.json(
            { 
                success: false, 
                message: "Erreur lors de la suppression.",
                error: error instanceof Error ? error.message : "Erreur inconnue"
            },
            { status: 500 }
        );
    }
}