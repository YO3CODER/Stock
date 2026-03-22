"use client"
import React, { useEffect, useState } from 'react'
import Wrapper from '../components/Wrapper'
import { useUser } from '@clerk/nextjs'
import { Product } from '@/type'
import { deleteProduct, readProducts } from '../actions'
import EmptyState from '../components/EmptyState'
import ProductImage from '../components/ProductImage'
import Link from 'next/link'
import { Trash } from 'lucide-react'
import { toast } from 'react-toastify'

const Page = () => {
    const { user } = useUser()
    const email = user?.primaryEmailAddress?.emailAddress as string
    const [products, setProducts] = useState<Product[]>([])
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const fetchProducts = async () => {
        try {
            if (email) {
                const productsData = await readProducts(email)
                if (productsData) {
                    setProducts(productsData)
                }
            }
        } catch (error) {
            console.error("Erreur lors du chargement des produits:", error)
            toast.error("Erreur lors du chargement des produits")
        }
    }

    useEffect(() => {
        if (email)
            fetchProducts()
    }, [email])

    const handleDeleteProduct = async (product: Product) => {
        const confirmDelete = confirm(`Voulez-vous vraiment supprimer "${product.name}" ?`)
        if (!confirmDelete) return;
        
        // Éviter les suppressions multiples
        if (isDeleting === product.id) return;
        
        setIsDeleting(product.id)
        
        try {
            // 1. Supprimer l'image si elle existe
            if (product.imageUrl && product.imageUrl !== "") {
                const deleteImageRes = await fetch("/api/upload", {
                    method: "DELETE",
                    body: JSON.stringify({ path: product.imageUrl }),
                    headers: { 'Content-Type': 'application/json' }
                })
                
                if (!deleteImageRes.ok) {
                    console.warn("Erreur lors de la suppression de l'image")
                } else {
                    const imageData = await deleteImageRes.json()
                    if (!imageData.success) {
                        console.warn(imageData.message || "Erreur lors de la suppression de l'image")
                    }
                }
            }
            
            // 2. Supprimer le produit de la base de données
            if (email) {
                await deleteProduct(product.id, email)
                await fetchProducts() // Recharger la liste
                toast.success(`"${product.name}" supprimé avec succès`)
            }
        } catch (error) {
            console.error("Erreur lors de la suppression:", error)
            toast.error(error instanceof Error ? error.message : "Erreur lors de la suppression du produit")
        } finally {
            setIsDeleting(null)
        }
    }

    return (
        <Wrapper>
            <div className='overflow-x-auto'>
                {products.length === 0 ? (
                    <div>
                        <EmptyState
                            message='Aucun produit disponible'
                            IconComponent='PackageSearch'
                        />
                    </div>
                ) : (
                    <table className='table'>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Image</th>
                                <th>Nom</th>
                                <th>Description</th>
                                <th>Prix</th>
                                <th>Quantité</th>
                                <th>Catégorie</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, index) => (
                                <tr key={product.id}>
                                    <th>{index + 1}</th>
                                    <td>
                                        <ProductImage
                                            src={product.imageUrl || "/placeholder-image.jpg"}
                                            alt={product.name}
                                            heightClass='h-12'
                                            widthClass='w-12'
                                        />
                                    </td>
                                    <td className='font-medium'>
                                        {product.name}
                                    </td>
                                    <td className='max-w-xs truncate'>
                                        {product.description}
                                    </td>
                                    <td>
                                        {product.price.toLocaleString()} FCFA
                                    </td>
                                    <td className='capitalize'>
                                        {product.quantity || 0} {product.unit || "pcs"}
                                    </td>
                                    <td>
                                        {product.categoryName || "Non catégorisé"}
                                    </td>
                                    <td className='flex gap-2'>
                                        <Link 
                                            className='btn btn-xs btn-primary' 
                                            href={`/update-product/${product.id}`}
                                        >
                                            Modifier
                                        </Link>
                                        <button 
                                            className='btn btn-xs btn-error' 
                                            onClick={() => handleDeleteProduct(product)}
                                            disabled={isDeleting === product.id}
                                        >
                                            {isDeleting === product.id ? (
                                                <span className="loading loading-spinner loading-xs"></span>
                                            ) : (
                                                <Trash className='w-4 h-4' />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Wrapper>
    )
}

export default Page