// filepath: apps/server/src/index.ts
import { createServer } from 'http';
import app from './app';
import { initializeSocket } from './socket';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { seedAchievements } from './modules/achievements/achievements.service';
import { initializeTreatmentSeriesMaintenance } from './modules/treatment-series/treatment-series.service';
import { initializeHappyHourScheduler } from './modules/happy-hours/happy-hours.service';
import { initializeSkinWeatherScheduler } from './modules/skin-weather/skin-weather.service';

const server = createServer(app);

initializeSocket(server);

const PORT = env.PORT;

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL database');

    await seedAchievements();
    await initializeTreatmentSeriesMaintenance();
    initializeHappyHourScheduler();
    initializeSkinWeatherScheduler();

    // Daily cleanup of expired refresh tokens
    const purgeExpiredTokens = async () => {
      const { count } = await prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
      if (count > 0) console.log(`Purged ${count} expired refresh token(s)`);
    };
    await purgeExpiredTokens();
    setInterval(purgeExpiredTokens, 24 * 60 * 60 * 1000);

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

const shutdown = () => {
  server.close(() => {
    prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});
