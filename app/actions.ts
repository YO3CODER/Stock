"use server"

import { neon } from '@neondatabase/serverless'
import { FormDataType, OrderItem, Product, ProductOverviewStats, StockSummary, Transaction, Category, Association } from "@/type"

// Initialiser la connexion Neon
const sql = neon(process.env.DATABASE_URL!)

export async function checkAndAddAssociation(email: string, name: string): Promise<void> {
    if (!email) return
    try {
        const existingAssociation = await sql`
            SELECT * FROM association WHERE email = ${email}
        `
        if (existingAssociation.length === 0 && name) {
            await sql`
                INSERT INTO association (email, name) 
                VALUES (${email}, ${name})
            `
        }
    } catch (error) {
        console.error(error)
    }
}

export async function getAssociation(email: string): Promise<Association | undefined> {
    if (!email) return
    try {
        const result = await sql`
            SELECT * FROM association WHERE email = ${email}
        `
        return result[0] as Association | undefined
    } catch (error) {
        console.error(error)
    }
}

export async function createCategory(
    name: string,
    email: string,
    description?: string
): Promise<void> {
    if (!name) return
    try {
        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }
        await sql`
            INSERT INTO category (name, description, "associationId") 
            VALUES (${name}, ${description || ""}, ${association.id})
        `
    } catch (error) {
        console.error(error)
    }
}

export async function updateCategory(
    id: string,
    email: string,
    name: string,
    description?: string,
): Promise<void> {
    if (!id || !email || !name) {
        throw new Error("L'id, l'email de l'association et le nom de la catégorie sont requis pour la mise à jour.")
    }

    try {
        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        await sql`
            UPDATE category 
            SET name = ${name}, description = ${description || ""}
            WHERE id = ${id} AND "associationId" = ${association.id}
        `
    } catch (error) {
        console.error(error)
    }
}

export async function deleteCategory(id: string, email: string): Promise<void> {
    if (!id || !email) {
        throw new Error("L'id, l'email de l'association et sont requis.")
    }

    try {
        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        await sql`
            DELETE FROM category 
            WHERE id = ${id} AND "associationId" = ${association.id}
        `
    } catch (error) {
        console.error(error)
    }
}

export async function readCategories(email: string): Promise<Category[]> {
    if (!email) {
        throw new Error("l'email de l'association est requis")
    }

    try {
        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        const categories = await sql`
            SELECT * FROM category 
            WHERE "associationId" = ${association.id}
            ORDER BY name ASC
        `
        return categories as Category[]
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function createProduct(formData: FormDataType, email: string): Promise<void> {
    try {
        const { name, description, price, imageUrl, categoryId, unit } = formData;
        if (!email || !price || !categoryId) {
            throw new Error("Le nom, le prix, la catégorie et l'email de l'association sont requis pour la création du produit.")
        }
        const safeImageUrl = imageUrl || ""
        const safeUnit = unit || ""

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        await sql`
            INSERT INTO product (name, description, price, "imageUrl", "categoryId", unit, "associationId")
            VALUES (${name}, ${description}, ${Number(price)}, ${safeImageUrl}, ${categoryId}, ${safeUnit}, ${association.id})
        `
    } catch (error) {
        console.error(error)
    }
}

export async function updateProduct(formData: FormDataType, email: string): Promise<void> {
    try {
        const { id, name, description, price, imageUrl } = formData;
        if (!email || !price || !id) {
            throw new Error("L'id, le nom, le prix et l'email sont requis pour la mise à jour du produit.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        await sql`
            UPDATE product 
            SET name = ${name}, description = ${description}, price = ${Number(price)}, "imageUrl" = ${imageUrl}
            WHERE id = ${id} AND "associationId" = ${association.id}
        `
    } catch (error) {
        console.error(error)
    }
}

export async function deleteProduct(id: string, email: string): Promise<void> {
    try {
        if (!id) {
            throw new Error("L'id est requis pour la suppression.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        await sql`
            DELETE FROM product 
            WHERE id = ${id} AND "associationId" = ${association.id}
        `
    } catch (error) {
        console.error(error)
    }
}

export async function readProducts(email: string): Promise<Product[]> {
    try {
        if (!email) {
            throw new Error("l'email est requis.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        const products = await sql`
            SELECT p.*, c.name as "categoryName"
            FROM product p
            LEFT JOIN category c ON p."categoryId" = c.id
            WHERE p."associationId" = ${association.id}
            ORDER BY p."createdAt" DESC
        `

        return products as Product[]
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function readProductById(productId: string, email: string): Promise<Product | undefined> {
    try {
        if (!email) {
            throw new Error("l'email est requis.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        const products = await sql`
            SELECT p.*, c.name as "categoryName"
            FROM product p
            LEFT JOIN category c ON p."categoryId" = c.id
            WHERE p.id = ${productId} AND p."associationId" = ${association.id}
        `
        
        return products[0] as Product | undefined
    } catch (error) {
        console.error(error)
    }
}

export async function replenishStockWithTransaction(productId: string, quantity: number, email: string): Promise<{ success: boolean; message?: string }> {
    try {
        if (quantity <= 0) {
            throw new Error("La quantité à ajouter doit être supérieure à zéro.")
        }

        if (!email) {
            throw new Error("l'email est requis.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        await sql`
            UPDATE product 
            SET quantity = quantity + ${quantity}
            WHERE id = ${productId} AND "associationId" = ${association.id}
        `

        await sql`
            INSERT INTO transaction (type, quantity, "productId", "associationId")
            VALUES ('IN', ${quantity}, ${productId}, ${association.id})
        `
        
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, message: error instanceof Error ? error.message : "Erreur lors du réapprovisionnement" }
    }
}

export async function deductStockWithTransaction(orderItems: OrderItem[], email: string): Promise<{ success: boolean; message?: string }> {
    try {
        if (!email) {
            throw new Error("l'email est requis.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        // Vérifier les stocks
        for (const item of orderItems) {
            const products = await sql`
                SELECT * FROM product WHERE id = ${item.productId}
            `
            const product = products[0]

            if (!product) {
                throw new Error(`Produit avec l'ID ${item.productId} introuvable.`)
            }

            if (item.quantity <= 0) {
                throw new Error(`La quantité demandée pour "${product.name}" doit être supérieure à zéro.`)
            }

            if (product.quantity < item.quantity) {
                throw new Error(`Le produit "${product.name}" n'a pas assez de stock. Demandé: ${item.quantity}, Disponible: ${product.quantity} / ${product.unit}.`)
            }
        }

        // Utiliser une transaction SQL
        for (const item of orderItems) {
            await sql`
                UPDATE product 
                SET quantity = quantity - ${item.quantity}
                WHERE id = ${item.productId} AND "associationId" = ${association.id}
            `
            await sql`
                INSERT INTO transaction (type, quantity, "productId", "associationId")
                VALUES ('OUT', ${item.quantity}, ${item.productId}, ${association.id})
            `
        }

        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, message: error instanceof Error ? error.message : "Erreur lors du don" }
    }
}

export async function getTransactions(email: string, limit?: number): Promise<Transaction[]> {
    try {
        if (!email) {
            throw new Error("l'email est requis.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        const transactions = await sql`
            SELECT t.*, 
                   p.name as "productName", 
                   p."imageUrl", 
                   p.price, 
                   p.unit,
                   c.name as "categoryName"
            FROM transaction t
            JOIN product p ON t."productId" = p.id
            LEFT JOIN category c ON p."categoryId" = c.id
            WHERE t."associationId" = ${association.id}
            ORDER BY t."createdAt" DESC
            ${limit ? sql`LIMIT ${limit}` : sql``}
        `

        return transactions as Transaction[]
    } catch (error) {
        console.error(error)
        return []
    }
}
export async function getProductOverviewStats(email: string): Promise<ProductOverviewStats> {
    try {
        if (!email) {
            throw new Error("l'email est requis.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        const products = await sql`
            SELECT * FROM product WHERE "associationId" = ${association.id}
        ` as Product[]

        const transactions = await sql`
            SELECT * FROM transaction WHERE "associationId" = ${association.id}
        `

        const categories = await sql`
            SELECT DISTINCT c.id 
            FROM category c
            JOIN product p ON p."categoryId" = c.id
            WHERE p."associationId" = ${association.id}
        `

        const totalProducts = products.length
        const totalCategories = categories.length
        const totalTransactions = transactions.length
        const stockValue = products.reduce((acc: number, product: Product) => {
            return acc + (Number(product.price) * (product.quantity || 0))
        }, 0)

        return {
            totalProducts,
            totalCategories,
            totalTransactions,
            stockValue,
        }
    } catch (error) {
        console.error(error)
        return {
            totalProducts: 0,
            totalCategories: 0,
            totalTransactions: 0,
            stockValue: 0,
        }
    }
}

export async function getProductCategoryDistribution(email: string): Promise<{ name: string; value: number }[]> {
    try {
        if (!email) {
            throw new Error("l'email est requis.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        const R = 5

        const data = await sql`
            SELECT c.name, COUNT(p.id) as value
            FROM category c
            LEFT JOIN product p ON p."categoryId" = c.id
            WHERE c."associationId" = ${association.id}
            GROUP BY c.id, c.name
            ORDER BY value DESC
            LIMIT ${R}
        `

        return data as { name: string; value: number }[]
    } catch (error) {
        console.error(error)
        return []
    }
}

export async function sellStockWithTransaction(orderItems: OrderItem[], email: string): Promise<{ success: boolean; message?: string }> {
    try {
        if (!email) {
            throw new Error("l'email est requis.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        // Vérifier les stocks
        for (const item of orderItems) {
            const products = await sql`
                SELECT * FROM product WHERE id = ${item.productId}
            `
            const product = products[0]

            if (!product) {
                throw new Error(`Produit avec l'ID ${item.productId} introuvable.`)
            }

            if (item.quantity <= 0) {
                throw new Error(`La quantité demandée pour "${product.name}" doit être supérieure à zéro.`)
            }

            if (product.quantity < item.quantity) {
                throw new Error(`Le produit "${product.name}" n'a pas assez de stock. Demandé: ${item.quantity}, Disponible: ${product.quantity} / ${product.unit}.`)
            }
        }

        // Utiliser une transaction SQL
        for (const item of orderItems) {
            await sql`
                UPDATE product 
                SET quantity = quantity - ${item.quantity}
                WHERE id = ${item.productId} AND "associationId" = ${association.id}
            `
            
            // Utiliser 'OUT' pour les sorties de stock (ventes)
            await sql`
                INSERT INTO transaction (type, quantity, "productId", "associationId")
                VALUES ('OUT', ${item.quantity}, ${item.productId}, ${association.id})
            `
        }

        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, message: error instanceof Error ? error.message : "Erreur lors de la vente" }
    }
}

export async function getStockSummary(email: string): Promise<StockSummary> {
    try {
        if (!email) {
            throw new Error("l'email est requis.")
        }

        const association = await getAssociation(email)
        if (!association) {
            throw new Error("Aucune association trouvée avec cet email.")
        }

        const allProducts = await sql`
            SELECT p.*, c.name as "categoryName"
            FROM product p
            LEFT JOIN category c ON p."categoryId" = c.id
            WHERE p."associationId" = ${association.id}
        `

        const products = allProducts as Product[]
        
        const inStock = products.filter((p: Product) => (p.quantity || 0) > 5)
        const lowStock = products.filter((p: Product) => (p.quantity || 0) > 0 && (p.quantity || 0) <= 5)
        const outOfStock = products.filter((p: Product) => (p.quantity || 0) === 0)
        const criticalProducts = [...lowStock, ...outOfStock]
        
        return {
            inStockCount: inStock.length,
            lowStockCount: lowStock.length,
            outOfStockCount: outOfStock.length,
            criticalProducts: criticalProducts.map((p: Product) => ({
                ...p,
                categoryName: p.categoryName
            }))
        }
    } catch (error) {
        console.error(error)
        return {
            inStockCount: 0,
            lowStockCount: 0,
            outOfStockCount: 0,
            criticalProducts: []
        }
    }
}