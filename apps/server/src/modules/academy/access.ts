export const hasActiveCourseAccess = (
  enrollment: { purchasedAt: Date; accessExpiresAt?: Date | null } | null | undefined,
  accessDays: number | null | undefined,
) => {
  if (!enrollment) return false;
  if (enrollment.accessExpiresAt) return enrollment.accessExpiresAt.getTime() > Date.now();
  if (!accessDays) return true;
  return enrollment.purchasedAt.getTime() + accessDays * 86_400_000 > Date.now();
};
