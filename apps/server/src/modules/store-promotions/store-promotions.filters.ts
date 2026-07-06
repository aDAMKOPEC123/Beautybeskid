export const getActivePromotionsWhere = (now = new Date()) => ({
  isActive: true,
  startDate: { lte: now },
  endDate: { gte: now },
});
