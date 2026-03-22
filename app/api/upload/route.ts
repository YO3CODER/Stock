import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';

// Configuration Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

        // Validation du type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, message: "Type de fichier non autorisé." },
                { status: 400 }
            );
        }

        // Convertir le fichier en buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload vers Cloudinary
        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: "asso-stock",
                    resource_type: "auto",
                    transformation: [{ quality: "auto", fetch_format: "auto" }]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(buffer);
        });

        const imageUrl = (result as any).secure_url;
        
        console.log("Upload réussi:", imageUrl);

        return NextResponse.json({ 
            success: true, 
            path: imageUrl,
            message: "Fichier uploadé avec succès."
        });
        
    } catch (error) {
        console.error("Erreur upload:", error);
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

        // Extraire l'ID public depuis l'URL Cloudinary
        const publicId = path.split('/').pop()?.split('.')[0];
        
        if (publicId) {
            await cloudinary.uploader.destroy(`asso-stock/${publicId}`);
            console.log("Image supprimée:", publicId);
        }
        
        return NextResponse.json(
            { success: true, message: "Fichier supprimé avec succès." },
            { status: 200 }
        );
        
    } catch (error) {
        console.error("Erreur suppression:", error);
        return NextResponse.json(
            { success: false, message: "Erreur lors de la suppression." },
            { status: 500 }
        );
    }
}