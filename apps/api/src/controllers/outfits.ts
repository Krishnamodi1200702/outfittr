import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateOutfitsForTrip } from '../lib/outfitEngine';

export async function generateOutfits(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const trip = await generateOutfitsForTrip(id, userId);
    if (!trip) {
      res.status(404).json({ message: 'Trip not found' });
      return;
    }
    res.json(trip);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate outfits';
    res.status(400).json({ message });
  }
}

export async function swapItem(req: Request, res: Response): Promise<void> {
  const { outfitId } = req.params;
  const { outfitItemId, newWardrobeItemId } = req.body;
  const userId = req.user!.userId;

  // Verify outfit ownership via trip -> user chain
  const outfit = await prisma.outfit.findFirst({
    where: { id: outfitId },
    include: { tripDay: { include: { trip: true } } },
  });

  if (!outfit || outfit.tripDay.trip.userId !== userId) {
    res.status(404).json({ message: 'Outfit not found' });
    return;
  }

  // Verify the outfitItem belongs to this outfit
  const outfitItem = await prisma.outfitItem.findFirst({
    where: { id: outfitItemId, outfitId },
  });

  if (!outfitItem) {
    res.status(404).json({ message: 'Outfit item not found' });
    return;
  }

  // Verify the new wardrobe item belongs to this user
  const newItem = await prisma.wardrobeItem.findFirst({
    where: { id: newWardrobeItemId, userId },
  });

  if (!newItem) {
    res.status(404).json({ message: 'Wardrobe item not found' });
    return;
  }

  // Perform the swap
  const updated = await prisma.outfitItem.update({
    where: { id: outfitItemId },
    data: { wardrobeItemId: newWardrobeItemId },
    include: { wardrobeItem: true },
  });

  res.json(updated);
}
