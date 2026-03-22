import { put, del } from '@vercel/blob';
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

        // Upload vers Vercel Blob
        const blob = await put(file.name, file, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });

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

        // Supprimer du Vercel Blob
        await del(path, {
            token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        
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