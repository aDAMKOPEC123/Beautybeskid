import { prisma } from '../../config/prisma';

export interface FeatureCard {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface AboutData {
  salonTagline?: string;
  salonDescription?: string;
  ownerName?: string;
  ownerTitle?: string;
  ownerBio?: string;
  featuresTitle?: string;
  features?: FeatureCard[];
  appDescription?: string;
}

export const getAbout = async () => {
  let about = await prisma.aboutPage.findFirst();
  if (!about) {
    about = await prisma.aboutPage.create({ data: {} });
  }
  return about;
};

export const upsertAbout = async (
  data: AboutData,
  salonCoverImage?: string,
  ownerPhoto?: string,
) => {
  const existing = await prisma.aboutPage.findFirst();

  const payload: Record<string, unknown> = {
    ...data,
    ...(salonCoverImage !== undefined && { salonCoverImage }),
    ...(ownerPhoto !== undefined && { ownerPhoto }),
  };

  if (existing) {
    return prisma.aboutPage.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.aboutPage.create({ data: payload });
};
