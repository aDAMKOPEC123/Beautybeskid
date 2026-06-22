import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import { processAndSaveImage } from '../../utils/imageProcessor';

export type PlanSection = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  externalLinks?: Array<{ label: string; url: string }>;
};

export type PlanExternalLink = { label: string; url: string };

// ─── Admin ────────────────────────────────────────────────────────────────────

export const getAllPlans = async () => {
  return prisma.beautyPlan.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, avatarPath: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
};

export const getPlanByUser = async (userId: string) => {
  return prisma.beautyPlan.findFirst({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
};

export const createPlan = async (
  userId: string,
  createdById: string,
  data: { title: string; intro?: string; sections?: PlanSection[]; externalLinks?: PlanExternalLink[] },
) => {
  // Use try/catch on P2002 instead of findFirst+create to avoid TOCTOU race condition
  try {
    return await prisma.beautyPlan.create({
      data: {
        userId,
        createdById,
        title: data.title,
        intro: data.intro,
        sections: (data.sections ?? []) as any,
        externalLinks: (data.externalLinks ?? []) as any,
        isPublished: false,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') throw new AppError('Ten użytkownik ma już beauty plan. Edytuj istniejący.', 409);
    throw e;
  }
};

export const updatePlan = async (
  id: string,
  data: {
    title?: string;
    intro?: string;
    sections?: PlanSection[];
    externalLinks?: PlanExternalLink[];
    isPublished?: boolean;
  },
) => {
  try {
    return await prisma.beautyPlan.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.intro !== undefined && { intro: data.intro }),
        ...(data.sections !== undefined && { sections: data.sections as any }),
        ...(data.externalLinks !== undefined && { externalLinks: data.externalLinks as any }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  } catch (e: any) {
    if (e?.code === 'P2025') throw new AppError('Beauty plan nie istnieje', 404);
    throw e;
  }
};

export const deletePlan = async (id: string) => {
  try {
    await prisma.beautyPlan.delete({ where: { id } });
  } catch (e: any) {
    if (e?.code === 'P2025') throw new AppError('Beauty plan nie istnieje', 404);
    throw e;
  }
};

export const uploadSectionImage = async (
  id: string,
  sectionId: string,
  buffer: Buffer,
): Promise<string> => {
  // Process image BEFORE acquiring any lock to avoid holding the transaction open during I/O
  const imagePath = await processAndSaveImage(buffer, 'beauty-plan');

  // Atomic JSON update via raw SQL — avoids read-modify-write race condition when
  // two concurrent uploads target different sections of the same plan.
  const updated = await prisma.$executeRaw`
    UPDATE "BeautyPlan"
    SET sections = (
      SELECT jsonb_agg(
        CASE WHEN s->>'id' = ${sectionId}
          THEN s || jsonb_build_object('imageUrl', ${imagePath})
          ELSE s
        END
      )
      FROM jsonb_array_elements(COALESCE(sections, '[]'::jsonb)) AS s
    ),
    "updatedAt" = now()
    WHERE id = ${id}
  `;

  if (updated === 0) throw new AppError('Beauty plan nie istnieje', 404);
  return imagePath;
};

// ─── User ─────────────────────────────────────────────────────────────────────

export const getMyPlan = async (userId: string) => {
  const plan = await prisma.beautyPlan.findFirst({
    where: { userId, isPublished: true },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });
  return plan ?? null;
};
