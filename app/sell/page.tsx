"use client"

import { OrderItem, Product, Transaction } from '@/type'
import { useUser } from '@clerk/nextjs'
import React, { useEffect, useState } from 'react'
import { sellStockWithTransaction, readProducts, getTransactions } from '../actions'
import Wrapper from '../components/Wrapper'
import ProductComponent from '../components/ProductComponent'
import EmptyState from '../components/EmptyState'
import ProductImage from '../components/ProductImage'
import { Trash, ShoppingBag } from 'lucide-react'
import { toast } from 'react-toastify'

const Page = () => {

    const { user } = useUser()
    const email = user?.primaryEmailAddress?.emailAddress as string
    const [products, setProducts] = useState<Product[]>([])
    const [order, setOrder] = useState<OrderItem[]>([])
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
    const [recentSales, setRecentSales] = useState<Transaction[]>([])
    const [showSalesList, setShowSalesList] = useState<boolean>(true)
    const [mounted, setMounted] = useState(false)

    const fetchProducts = async () => {
        try {
            if (email) {
                const products = await readProducts(email)
                if (products) {
                    setProducts(products)
                }
            }
        } catch (error) {
            console.error(error)
        }
    }

    const fetchRecentSales = async () => {
        try {
            if (email) {
                const transactions = await getTransactions(email, 10)
                // Filtrer pour n'afficher que les ventes (type 'VENTE' ou 'OUT' selon votre base de données)
                const sales = transactions.filter(t => t.type === 'VENTE' || t.type === 'OUT')
                setRecentSales(sales)
            }
        } catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        setMounted(true)
        if (email) {
            fetchProducts()
            fetchRecentSales()
        }
    }, [email])

    const filteredAvailableProducts = products
        .filter((product) =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .filter((product) => !selectedProductIds.includes(product.id))
        .slice(0, 10)

    const handleAddToCart = (product: Product) => {
        setOrder((prevOrder) => {
            const existingProduct = prevOrder.find((item) => item.productId === product.id)
            let updatedOrder
            if (existingProduct) {
                updatedOrder = prevOrder.map((item) =>
                    item.productId === product.id ?
                        {
                            ...item,
                            quantity: Math.min(item.quantity + 1, product.quantity || 0)
                        } : item
                )
            } else {
                updatedOrder = [
                    ...prevOrder,
                    {
                        productId: product.id,
                        quantity: 1,
                        unit: product.unit || 'pièce',
                        imageUrl: product.imageUrl || '',
                        name: product.name,
                        availableQuantity: product.quantity || 0,
                        price: product.price,
                    }

                ]
            }

            setSelectedProductIds((prevSelected) =>
                prevSelected.includes(product.id)
                    ? prevSelected
                    : [...prevSelected, product.id]
            )
            return updatedOrder
        })
    }

    const handleQuantityChange = (productId: string, quantity: number) => {
        setOrder((prevOrder) =>
            prevOrder.map((item) =>
                item.productId === productId ? { ...item, quantity } : item
            )
        )
    }

    const handleRemoveFromCart = (productId: string) => {
        setOrder((prevOrder) => {
            const updatedOrder = prevOrder.filter((item) => item.productId !== productId)
            setSelectedProductIds((prevSelectedProductIds) =>
                prevSelectedProductIds.filter((id) => id !== productId)
            )
            return updatedOrder
        })
    }


    const handleSubmit = async () => {
        try {
            if (order.length == 0) {
                toast.error("Veuillez ajouter des produits à la vente.")
                return
            }
            const response = await sellStockWithTransaction(order, email)

            if (response?.success) {
                toast.success("Vente confirmée avec succès !")
                setOrder([])
                setSelectedProductIds([])
                fetchProducts();
                fetchRecentSales();
            } else {
                toast.error(`${response?.message}`)
            }
        } catch (error) {
            console.error(error)
        }
    }

    // Calcul du total
    const calculateTotal = () => {
        return order.reduce((total, item) => total + (item.price * item.quantity), 0)
    }

    // Formater la date
    const formatDate = (date: Date) => {
        if (!mounted) return ''
        return new Date(date).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Éviter l'hydratation en ne rendant pas les parties dépendantes du client avant le montage
    if (!mounted) {
        return (
            <Wrapper>
                <div className="space-y-6">
                    <div className="flex md:flex-row flex-col-reverse">
                        <div className="md:w-1/3">
                            <div className="skeleton h-12 w-full mb-4"></div>
                            <div className="space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="skeleton h-32 w-full"></div>
                                ))}
                            </div>
                        </div>
                        <div className="md:w-2/3 p-4 md:ml-4 mb-4 md:mb-0 h-fit border-2 border-base-200 rounded-3xl">
                            <div className="skeleton h-64 w-full"></div>
                        </div>
                    </div>
                </div>
            </Wrapper>
        )
    }


    return (
        <Wrapper>
            <div className="space-y-6">
                {/* Section principale avec les produits et le panier */}
                <div className="flex md:flex-row flex-col-reverse">
                    <div className="md:w-1/3">
                        <input
                            type="text"
                            placeholder="Rechercher un produit..."
                            className="input input-bordered w-full mb-4"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="space-y-4">
                            {filteredAvailableProducts.length > 0 ? (
                                filteredAvailableProducts.map((product, index) => (
                                    <ProductComponent
                                        key={index}
                                        add={true}
                                        product={product}
                                        handleAddToCart={handleAddToCart}
                                    />
                                ))
                            ) : (
                                <EmptyState
                                    message="Aucun produit disponible"
                                    IconComponent="PackageSearch"
                                />
                            )}
                        </div>
                    </div>
                    <div className="md:w-2/3 p-4 md:ml-4 mb-4 md:mb-0 h-fit border-2 border-base-200 rounded-3xl overflow-x-auto">
                        {order.length > 0 ? (
                            <>
                                <table className="table w-full scroll-auto">
                                    <thead>
                                        <tr>
                                            <th>Image</th>
                                            <th>Nom</th>
                                            <th>Quantité</th>
                                            <th>Unité</th>
                                            <th>Prix Unitaire</th>
                                            <th>Total</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.map((item) => (
                                            <tr key={item.productId}>
                                                <td>
                                                    <ProductImage
                                                        src={item.imageUrl}
                                                        alt={item.name}
                                                        heightClass="h-12"
                                                        widthClass="w-12"
                                                    />
                                                </td>
                                                <td>
                                                    {item.name}
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        min="1"
                                                        max={item.availableQuantity}
                                                        className="input input-bordered w-20"
                                                        onChange={(e) => handleQuantityChange(item.productId, Number(e.target.value))}
                                                    />
                                                </td>
                                                <td className="capitalize">
                                                    {item.unit}
                                                </td>
                                                <td>
                                                    {item.price.toLocaleString()} FCFA
                                                </td>
                                                <td>
                                                    {(item.price * item.quantity).toLocaleString()} FCFA
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-sm btn-error"
                                                        onClick={() => handleRemoveFromCart(item.productId)}
                                                    >
                                                        <Trash className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="flex justify-between items-center mt-4">
                                    <button
                                        onClick={handleSubmit}
                                        className="btn btn-primary"
                                    >
                                        Confirmer la Vente
                                    </button>
                                    <div className="text-xl font-bold">
                                        Total: {calculateTotal().toLocaleString()} FCFA
                                    </div>
                                </div>
                            </>
                        ) : (
                            <EmptyState
                                message="Aucun produit dans le panier"
                                IconComponent="ShoppingCart"
                            />
                        )}
                    </div>
                </div>

                {/* Section des ventes récentes */}
                {recentSales.length > 0 && (
                    <div className="mt-8 border-t-2 border-base-200 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <ShoppingBag className="w-6 h-6" />
                                Ventes Récentes
                            </h2>
                            <button
                                onClick={() => setShowSalesList(!showSalesList)}
                                className="btn btn-sm btn-ghost"
                            >
                                {showSalesList ? 'Masquer' : 'Afficher'}
                            </button>
                        </div>

                        {showSalesList && (
                            <div className="overflow-x-auto">
                                <table className="table table-zebra w-full">
                                    <thead>
                                        <tr className="bg-base-200">
                                            <th>Date</th>
                                            <th>Produit</th>
                                            <th>Quantité</th>
                                            <th>Prix Unitaire</th>
                                            <th>Total</th>
                                            <th>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentSales.map((sale) => (
                                            <tr key={sale.id}>
                                                <td className="whitespace-nowrap">
                                                    {formatDate(sale.createdAt)}
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        {sale.imageUrl && (
                                                            <ProductImage
                                                                src={sale.imageUrl}
                                                                alt={sale.productName}
                                                                heightClass="h-8 w-8"
                                                                widthClass="h-8 w-8"
                                                            />
                                                        )}
                                                        <span className="font-medium">{sale.productName}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge badge-primary">
                                                        {sale.quantity} {sale.unit}
                                                    </span>
                                                </td>
                                                <td>
                                                    {sale.price ? `${sale.price.toLocaleString()} FCFA` : 'N/A'}
                                                </td>
                                                <td className="font-bold text-green-600">
                                                    {sale.price ? `${(sale.price * sale.quantity).toLocaleString()} FCFA` : 'N/A'}
                                                </td>
                                                <td>
                                                    <span className={`badge ${sale.type === 'VENTE' ? 'badge-success' : 'badge-soft badge-accent'}`}>
                                                        {sale.type === 'VENTE' ? 'Vente' : 'Sortie'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Wrapper>
    )
}

export default Page