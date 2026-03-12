import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateOutfitsForTrip } from '../lib/outfitEngine';
import { updateUserWeightsFromSignals, getLearningStats } from '../lib/learningEngine';

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
    include: { wardrobeItem: true },
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

  // Record the swap event
  await prisma.swapEvent.create({
    data: {
      userId,
      outfitId,
      outfitItemId,
      fromWardrobeItemId: outfitItem.wardrobeItemId,
      toWardrobeItemId: newWardrobeItemId,
      category: outfitItem.wardrobeItem.category,
    },
  });

  // Perform the swap
  const updated = await prisma.outfitItem.update({
    where: { id: outfitItemId },
    data: { wardrobeItemId: newWardrobeItemId },
    include: { wardrobeItem: true },
  });

  // Update learned weights in the background
  updateUserWeightsFromSignals(userId).catch((err) =>
    console.error('[learn] Failed to update weights after swap:', err.message),
  );

  res.json(updated);
}

export async function submitFeedback(req: Request, res: Response): Promise<void> {
  const { outfitId } = req.params;
  const { rating, reasons } = req.body;
  const userId = req.user!.userId;

  // Verify outfit exists and user owns it via trip chain
  const outfit = await prisma.outfit.findFirst({
    where: { id: outfitId },
    include: { tripDay: { include: { trip: true } } },
  });

  if (!outfit || outfit.tripDay.trip.userId !== userId) {
    res.status(404).json({ message: 'Outfit not found' });
    return;
  }

  // Upsert feedback
  const feedback = await prisma.outfitFeedback.upsert({
    where: { userId_outfitId: { userId, outfitId } },
    update: { rating, reasons },
    create: { userId, outfitId, rating, reasons },
  });

  // Update learned weights in the background
  updateUserWeightsFromSignals(userId).catch((err) =>
    console.error('[learn] Failed to update weights after feedback:', err.message),
  );

  res.json(feedback);
}

export async function getFeedback(req: Request, res: Response): Promise<void> {
  const { outfitId } = req.params;
  const userId = req.user!.userId;

  const feedback = await prisma.outfitFeedback.findUnique({
    where: { userId_outfitId: { userId, outfitId } },
  });

  res.json(feedback);
}

export async function getPersonalizationSummary(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const stats = await getLearningStats(userId);
  res.json(stats);
}
