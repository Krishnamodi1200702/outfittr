import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getWeatherForTrip, weatherCodeToLabel } from '../lib/weather';

// ── Helper: populate weather for a trip's days ───────
async function populateWeather(tripId: string, location: string, startDate: Date, endDate: Date) {
  const result = await getWeatherForTrip(location, startDate, endDate);
  if (!result || result.forecasts.length === 0) return;

  const days = await prisma.tripDay.findMany({
    where: { tripId },
    orderBy: { date: 'asc' },
  });

  const forecastMap = new Map(result.forecasts.map((f) => [f.date, f]));
  const now = new Date();

  for (const day of days) {
    const dateKey = day.date.toISOString().slice(0, 10);
    const fc = forecastMap.get(dateKey);
    if (!fc) continue;

    await prisma.tripDay.update({
      where: { id: day.id },
      data: {
        weatherHigh: fc.tempMaxC,
        weatherLow: fc.tempMinC,
        weatherCondition: weatherCodeToLabel(fc.weatherCode),
        precipitationMm: fc.precipitationSumMm,
        weatherCode: fc.weatherCode,
        weatherFetchedAt: now,
      },
    });
  }
}

// ── Controllers ──────────────────────────────────────

export async function listTrips(req: Request, res: Response): Promise<void> {
  const trips = await prisma.trip.findMany({
    where: { userId: req.user!.userId },
    orderBy: { startDate: 'desc' },
    include: { days: { orderBy: { date: 'asc' } } },
  });
  res.json(trips);
}

export async function createTrip(req: Request, res: Response): Promise<void> {
  const { name, location, startDate, endDate, activities } = req.body;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Generate TripDay entries for each day of the trip
  const days: { date: Date }[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push({ date: new Date(current) });
    current.setDate(current.getDate() + 1);
  }

  const trip = await prisma.trip.create({
    data: {
      userId: req.user!.userId,
      name,
      location,
      startDate: start,
      endDate: end,
      activities,
      days: { create: days },
    },
    include: { days: { orderBy: { date: 'asc' } } },
  });

  // Fetch weather in the background — don't block the response
  populateWeather(trip.id, location, start, end).catch((err) =>
    console.error('[weather] Failed to populate on create:', err.message),
  );

  res.status(201).json(trip);
}

export async function getTrip(req: Request, res: Response): Promise<void> {
  const trip = await prisma.trip.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: {
      days: {
        orderBy: { date: 'asc' },
        include: {
          outfits: {
            include: {
              items: { include: { wardrobeItem: true } },
            },
          },
        },
      },
    },
  });

  if (!trip) {
    res.status(404).json({ message: 'Trip not found' });
    return;
  }

  res.json(trip);
}

export async function deleteTrip(req: Request, res: Response): Promise<void> {
  const existing = await prisma.trip.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });

  if (!existing) {
    res.status(404).json({ message: 'Trip not found' });
    return;
  }

  await prisma.trip.delete({ where: { id: req.params.id } });
  res.status(204).send();
}

export async function refreshWeather(req: Request, res: Response): Promise<void> {
  const trip = await prisma.trip.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: { days: { orderBy: { date: 'asc' } } },
  });

  if (!trip) {
    res.status(404).json({ message: 'Trip not found' });
    return;
  }

  await populateWeather(trip.id, trip.location, trip.startDate, trip.endDate);

  // Re-fetch with updated data
  const updated = await prisma.trip.findFirst({
    where: { id: trip.id },
    include: {
      days: {
        orderBy: { date: 'asc' },
        include: {
          outfits: {
            include: {
              items: { include: { wardrobeItem: true } },
            },
          },
        },
      },
    },
  });

  res.json(updated);
}
