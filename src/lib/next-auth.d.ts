import { create } from "domain";

const session = async ({ session, token }: { session: Session; token: JWT }) => {
  if (token?.id) {
    const userInDb = await prisma.utilisateur.findUnique({
      where: { id: parseInt(token.id as string, 10) },
      select: {
        nom: true,
        email: true,
        pseudo: true,
        role: true,
        createdAt: true,
        questions: true,
        rooms: true
      },
    });

    if (userInDb) {
      session.user = {
        name: userInDb.nom,
        email: userInDb.email,
        pseudo: userInDb.pseudo,
        role: userInDb.role,
        createdAt: userInDb.createdAt,
        questions: userInDb.questions,
        rooms: userInDb.rooms
      };
    }
  }

  return session;
};