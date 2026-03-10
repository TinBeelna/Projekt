// neka google skripta da mi pomogne ubaciti pocetke podatke
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.user.deleteMany({}) //brisi stare za svaki slucaj

  await prisma.user.createMany({
    data: [
      { email: 'admin@test.com', password: 'admin123', role: 'ADMIN' , firstName: 'Admin', lastName: 'Adminovic'},
      { email: 'user@test.com', password: 'user123', role: 'USER' , firstName: 'User', lastName: 'Userovic'},
    ],
  })
  console.log("Podaci ubačeni!")
}

main().catch(e => console.error(e))
