import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function listItems(req: Request, res: Response): Promise<void> {
  const items = await prisma.wardrobeItem.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
}

export async function createItem(req: Request, res: Response): Promise<void> {
  const item = await prisma.wardrobeItem.create({
    data: { ...req.body, userId: req.user!.userId },
  });
  res.status(201).json(item);
}

export async function updateItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.wardrobeItem.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!existing) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }

  const updated = await prisma.wardrobeItem.update({
    where: { id },
    data: req.body,
  });
  res.json(updated);
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.wardrobeItem.findFirst({
    where: { id, userId: req.user!.userId },
  });

  if (!existing) {
    res.status(404).json({ message: 'Item not found' });
    return;
  }

  await prisma.wardrobeItem.delete({ where: { id } });
  res.status(204).send();
}
