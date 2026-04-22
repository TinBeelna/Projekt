import { prisma } from "app/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000; // 15 minuta
const MAX_REQUESTS = 10; //broj requestova moguc u WINDOW_MS intervalu

export async function checkRateLimit(
  userId: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date();

  const record = await prisma.rateLimit.findUnique({ where: { userId } });

  if (!record || now.getTime() - record.windowStart.getTime() > WINDOW_MS) { //ako nema requesta od prije (record) ili istekne WINDOW_MS, count na 1 i windowStart reset 
    await prisma.rateLimit.upsert({
      where: { userId },
      update: { count: 1, windowStart: now },
      create: { userId, count: 1, windowStart: now },
    });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS) { //ako je record.count veci od max broja requesta za interval: deny
    const retryAfter = Math.ceil(
      (record.windowStart.getTime() + WINDOW_MS - now.getTime()) / 1000
    );
    return { allowed: false, retryAfter };
  }

  await prisma.rateLimit.update({ //aktivan time window, ispod limita; update db record +=1
    where: { userId },
    data: { count: { increment: 1 } },
  });

  return { allowed: true };
}
