"use client";

import React from 'react';
import Image from 'next/image';

interface ProductImageProps {
    src?: string | null;
    alt: string;
    heightClass?: string;
    widthClass?: string;
}

// Fonction helper pour les URLs d'images
function getImageUrl(url: string | null | undefined): string {
    if (!url) return '/placeholder-image.jpg';
    
    // Si c'est une URL de Vercel Blob privé, passer par notre endpoint
    if (url.includes('vercel-storage.com') || url.includes('private.blob')) {
        return `/api/image/${encodeURIComponent(url)}`;
    }
    
    return url;
}

const ProductImage: React.FC<ProductImageProps> = ({ 
    src, 
    alt, 
    heightClass = 'h-40', 
    widthClass = 'w-40' 
}) => {
    const imageSrc = getImageUrl(src);
    
    return (
        <div className={`relative ${heightClass} ${widthClass}`}>
            <Image
                src={imageSrc}
                alt={alt}
                fill
                className="object-cover rounded-lg"
                onError={(e) => {
                    // En cas d'erreur, afficher une image par défaut
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-image.jpg';
                }}
            />
        </div>
    );
};

export default ProductImage;