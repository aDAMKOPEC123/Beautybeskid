import { AcademyLegalDocumentType } from '@prisma/client';
import { prisma } from '../../../config/prisma';
import { AppError } from '../../../middleware/error.middleware';
import { defaultLegalDocuments, LEGAL_VERSION } from './legal.defaults';

const sellerId = 'academy-seller';
const defaultSeller = {
  id: sellerId,
  legalName: 'BeskidStudio By Wiktoria Ćwik',
  displayName: 'Akademia BeskidStudio',
  street: 'Mordarka 505',
  postalCode: '34-600',
  city: 'Mordarka',
  country: 'Polska',
  email: 'kontakt@kosmetologwiktoriacwik.pl',
  phone: '+48 532 128 227',
};

export const ensureLegalData = async () => {
  const seller = await prisma.academySellerProfile.upsert({
    where: { id: sellerId },
    create: defaultSeller,
    update: {},
  });
  const defaults = defaultLegalDocuments(seller);
  await Promise.all(Object.entries(defaults).map(([type, document]) =>
    prisma.academyLegalDocument.upsert({
      where: { type_version: { type: type as AcademyLegalDocumentType, version: LEGAL_VERSION } },
      create: {
        type: type as AcademyLegalDocumentType,
        version: LEGAL_VERSION,
        title: document.title,
        content: document.content,
        isPublished: true,
        publishedAt: new Date(),
      },
      update: {},
    })
  ));
  return seller;
};

export const getPublicDocument = async (type: AcademyLegalDocumentType) => {
  await ensureLegalData();
  const document = await prisma.academyLegalDocument.findFirst({
    where: { type, isPublished: true },
    orderBy: { publishedAt: 'desc' },
  });
  if (!document) throw new AppError('Dokument nie jest jeszcze opublikowany', 404);
  return document;
};

export const getDocumentVersion = async (type: AcademyLegalDocumentType, version: string) => {
  await ensureLegalData();
  const document = await prisma.academyLegalDocument.findUnique({ where: { type_version: { type, version } } });
  if (!document) throw new AppError('Nie znaleziono zapisanej wersji dokumentu', 404);
  return document;
};

export const getCurrentVersions = async () => {
  await ensureLegalData();
  const documents = await prisma.academyLegalDocument.findMany({
    where: { type: { in: ['TERMS', 'PRIVACY'] }, isPublished: true },
    orderBy: { publishedAt: 'desc' },
  });
  const terms = documents.find((item) => item.type === 'TERMS');
  const privacy = documents.find((item) => item.type === 'PRIVACY');
  if (!terms || !privacy) throw new AppError('Dokumenty sprzedażowe nie są kompletne', 503);
  return { termsVersion: terms.version, privacyVersion: privacy.version };
};

export const getPublicCommerceInfo = async () => {
  const seller = await ensureLegalData();
  const published = await prisma.academyLegalDocument.findMany({
    where: { isPublished: true },
    select: { type: true, version: true },
  });
  const sellerComplete = Boolean(
    seller.legalName && seller.taxId && seller.street && seller.postalCode && seller.city && seller.email && seller.phone
  );
  return {
    seller: {
      legalName: seller.legalName,
      displayName: seller.displayName,
      taxId: seller.taxId,
      registryNumber: seller.registryNumber,
      address: `${seller.street}, ${seller.postalCode} ${seller.city}, ${seller.country}`,
      email: seller.email,
      phone: seller.phone,
    },
    documentVersions: Object.fromEntries(published.map((item) => [item.type, item.version])),
    readiness: {
      sellerComplete,
      legalDocumentsComplete: new Set(published.map((item) => item.type)).size === 6,
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    },
  };
};

export const adminGetLegal = async () => {
  const seller = await ensureLegalData();
  const documents = await prisma.academyLegalDocument.findMany({ orderBy: [{ type: 'asc' }, { createdAt: 'desc' }] });
  return { seller, documents };
};

export const adminUpdateSeller = async (data: Partial<typeof defaultSeller> & { taxId?: string | null; registryNumber?: string | null }) => {
  const seller = await prisma.academySellerProfile.update({ where: { id: sellerId }, data });
  if (seller.taxId) {
    const defaults = defaultLegalDocuments(seller);
    await Promise.all(Object.entries(defaults).map(([type, document]) => prisma.academyLegalDocument.updateMany({
      where: { type: type as AcademyLegalDocumentType, version: LEGAL_VERSION, content: { contains: '[DO UZUPEŁNIENIA' } },
      data: { title: document.title, content: document.content },
    })));
  }
  return seller;
};

export const adminUpdateDocument = async (id: string, data: { title?: string; content?: string; version?: string; publish?: boolean }) => {
  const current = await prisma.academyLegalDocument.findUnique({ where: { id } });
  if (!current) throw new AppError('Nie znaleziono dokumentu', 404);
  if (data.publish) {
    await prisma.academyLegalDocument.updateMany({ where: { type: current.type, id: { not: id } }, data: { isPublished: false } });
  }
  return prisma.academyLegalDocument.update({
    where: { id },
    data: {
      ...(data.title ? { title: data.title } : {}),
      ...(data.content ? { content: data.content } : {}),
      ...(data.version ? { version: data.version } : {}),
      ...(data.publish ? { isPublished: true, publishedAt: new Date() } : {}),
    },
  });
};
