import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function getStyleProfile(req: Request, res: Response): Promise<void> {
  const profile = await prisma.styleProfile.findUnique({
    where: { userId: req.user!.userId },
  });
  res.json(profile);
}

export async function upsertStyleProfile(req: Request, res: Response): Promise<void> {
  const {
    bodyType,
    heightRange,
    skinUndertone,
    styleVibe,
    fitPreference,
    favoriteColors,
    avoidColors,
  } = req.body;

  const profile = await prisma.styleProfile.upsert({
    where: { userId: req.user!.userId },
    update: {
      bodyType,
      heightRange,
      skinUndertone,
      styleVibe,
      fitPreference,
      favoriteColors,
      avoidColors,
    },
    create: {
      userId: req.user!.userId,
      bodyType,
      heightRange,
      skinUndertone,
      styleVibe,
      fitPreference,
      favoriteColors,
      avoidColors,
    },
  });

  res.json(profile);
}
