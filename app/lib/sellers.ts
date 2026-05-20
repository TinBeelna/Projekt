import { prisma } from "@/app/lib/prisma";

export async function getSellers() {
    return prisma.seller.findMany({
        include: { products: { where: { active: true } } },
        orderBy: { id: 'asc' },
    });
}

export type SellerWithProducts = Awaited<ReturnType<typeof getSellers>>[number];
