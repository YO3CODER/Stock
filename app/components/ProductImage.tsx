"use client";

import React from 'react';
import Image from 'next/image';

interface ProductImageProps {
    src?: string | null;
    alt: string;
    heightClass?: string;
    widthClass?: string;
}

const ProductImage: React.FC<ProductImageProps> = ({ 
    src, 
    alt, 
    heightClass = 'h-40', 
    widthClass = 'w-40' 
}) => {
    const imageUrl = src || '/placeholder-image.jpg';
    
    return (
        <div className={`relative ${heightClass} ${widthClass}`}>
            <Image
                src={imageUrl}
                alt={alt}
                fill
                className="object-cover rounded-lg"
                unoptimized // Pour Cloudinary qui a déjà ses propres optimisations
            />
        </div>
    );
};

export default ProductImage;