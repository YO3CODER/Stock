"use client"
import { readProductById, updateProduct } from '@/app/actions'
import ProductImage from '@/app/components/ProductImage'
import Wrapper from '@/app/components/Wrapper'
import { FormDataType, Product } from '@/type'
import { useUser } from '@clerk/nextjs'
import { FileImage } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

const Page = ({ params }: { params: Promise<{ productId: string }> }) => {

    const { user } = useUser()
    const email = user?.primaryEmailAddress?.emailAddress as string
    const [product, setProduct] = useState<Product | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState<FormDataType>({
        id: "",
        name: "",
        description: "",
        price: 0,
        imageUrl: "",
        categoryName: ""
    })
    const router = useRouter()

    const fetchProduct = async () => {
        try {
            const { productId } = await params
            if (email) {
                const fetchedProduct = await readProductById(productId, email)
                if (fetchedProduct) {
                    setProduct(fetchedProduct)
                    setFormData({
                        id: fetchedProduct.id,
                        name: fetchedProduct.name,
                        description: fetchedProduct.description,
                        price: fetchedProduct.price,
                        imageUrl: fetchedProduct.imageUrl || "",
                        categoryName: fetchedProduct.categoryName,
                        unit: fetchedProduct.unit // Ajout de l'unité si nécessaire
                    })
                }
            }
        } catch (error) {
            console.error(error)
            toast.error("Erreur lors du chargement du produit")
        }
    }

    useEffect(() => {
        fetchProduct()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null
        setFile(selectedFile)
        if (selectedFile) {
            setPreviewUrl(URL.createObjectURL(selectedFile))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Éviter les soumissions multiples
        if (isSubmitting) return
        
        // Validation des champs
        if (!formData.name || !formData.description || !formData.price) {
            toast.error("Veuillez remplir tous les champs obligatoires.")
            return
        }
        
        setIsSubmitting(true)
        
        try {
            let imageUrl = formData.imageUrl
            
            // Si une nouvelle image a été sélectionnée
            if (file) {
                // 1. Supprimer l'ancienne image si elle existe
                if (formData.imageUrl && formData.imageUrl !== "") {
                    const deleteRes = await fetch("/api/upload", {
                        method: "DELETE",
                        body: JSON.stringify({ path: formData.imageUrl }),
                        headers: { 'Content-Type': 'application/json' }
                    })
                    
                    if (!deleteRes.ok) {
                        console.warn("Erreur lors de la suppression de l'ancienne image")
                    } else {
                        const deleteData = await deleteRes.json()
                        if (!deleteData.success) {
                            console.warn(deleteData.message)
                        }
                    }
                }
                
                // 2. Upload de la nouvelle image
                const imageData = new FormData()
                imageData.append("file", file)
                
                const uploadRes = await fetch("/api/upload", {
                    method: "POST",
                    body: imageData
                })
                
                if (!uploadRes.ok) {
                    throw new Error(`Erreur upload: ${uploadRes.status}`)
                }
                
                const uploadData = await uploadRes.json()
                
                if (!uploadData.success) {
                    throw new Error(uploadData.message || "Erreur lors de l'upload de l'image")
                }
                
                imageUrl = uploadData.path
            }
            
            // 3. Créer l'objet de mise à jour avec la nouvelle image (ou l'ancienne)
            const updateData: FormDataType = {
                id: formData.id,
                name: formData.name,
                description: formData.description,
                price: formData.price,
                imageUrl: imageUrl,
                categoryName: formData.categoryName,
                unit: formData.unit
            }
            
            // 4. Mettre à jour le produit
            await updateProduct(updateData, email)
            
            toast.success("Produit mis à jour avec succès !")
            router.push("/products")
            
        } catch (error) {
            console.error("Erreur lors de la mise à jour:", error)
            toast.error(error instanceof Error ? error.message : "Erreur lors de la mise à jour")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Wrapper>
            <div>
                {product ? (
                    <div>
                        <h1 className='text-2xl font-bold mb-4'>
                            Mise à jour du produit
                        </h1>
                        <div className='flex md:flex-row flex-col md:items-start'>
                            <form className='space-y-2 md:w-[450px]' onSubmit={handleSubmit}>
                                <div className='text-sm font-semibold mb-2'>Nom</div>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Nom"
                                    className='input input-bordered w-full'
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                />
                                
                                <div className='text-sm font-semibold mb-2'>Description</div>
                                <textarea
                                    name="description"
                                    placeholder="Description"
                                    className='textarea textarea-bordered w-full'
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    required
                                />

                                <div className='text-sm font-semibold mb-2'>Catégorie</div>
                                <input
                                    type="text"
                                    name="categoryName"
                                    className='input input-bordered w-full'
                                    value={formData.categoryName}
                                    disabled
                                />
                                
                                <div className='text-sm font-semibold mb-2'>Prix Unitaire</div>
                                <input
                                    type="number"
                                    name="price"
                                    placeholder="Prix"
                                    className='input input-bordered w-full'
                                    value={formData.price}
                                    onChange={handleInputChange}
                                    required
                                    step="0.01"
                                />
                                
                                <div className='text-sm font-semibold mb-2'>Nouvelle image (optionnel)</div>
                                <input
                                    type="file"
                                    accept='image/*'
                                    className='file-input file-input-bordered w-full'
                                    onChange={handleFileChange}
                                />

                                <button 
                                    type='submit' 
                                    className='btn btn-primary mt-3 w-full'
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Mise à jour en cours..." : "Mettre à jour"}
                                </button>
                            </form>

                            <div className='flex md:flex-col md:ml-8 mt-8 md:mt-0'>
                                {/* Image actuelle */}
                                <div className='mb-4'>
                                    <div className='text-sm font-semibold mb-2 text-center'>Image actuelle</div>
                                    <div className='border-2 border-primary w-[200px] h-[200px] p-5 flex justify-center items-center rounded-3xl'>
                                        {formData.imageUrl && formData.imageUrl !== "" ? (
                                            <ProductImage
                                                src={formData.imageUrl}
                                                alt={product.name}
                                                heightClass='h-40'
                                                widthClass='w-40'
                                            />
                                        ) : (
                                            <div className='wiggle-animation'>
                                                <FileImage strokeWidth={1} className='h-10 w-10 text-primary' />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Aperçu de la nouvelle image */}
                                <div>
                                    <div className='text-sm font-semibold mb-2 text-center'>Aperçu nouvelle image</div>
                                    <div className='border-2 border-primary w-[200px] h-[200px] p-5 flex justify-center items-center rounded-3xl'>
                                        {previewUrl && previewUrl !== "" ? (
                                            <ProductImage
                                                src={previewUrl}
                                                alt="preview"
                                                heightClass='h-40'
                                                widthClass='w-40'
                                            />
                                        ) : (
                                            <div className='wiggle-animation'>
                                                <FileImage strokeWidth={1} className='h-10 w-10 text-primary' />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className='flex justify-center items-center w-full min-h-[400px]'>
                        <span className="loading loading-spinner loading-xl"></span>
                    </div>
                )}
            </div>
        </Wrapper>
    )
}

export default Page