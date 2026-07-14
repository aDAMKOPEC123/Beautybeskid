import { Request, Response, NextFunction } from 'express';
import * as coursesService from './courses.service';

export const listPublic = async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await coursesService.listPublic() }); } catch (error) { next(error); }
};

export const getPublicCourse = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await coursesService.getPublicCourse(req.params.slug) }); } catch (error) { next(error); }
};

export const listPublicBundles = async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await coursesService.listPublicBundles() }); } catch (error) { next(error); }
};

export const getPublicBundle = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await coursesService.getPublicBundle(req.params.slug) }); } catch (error) { next(error); }
};

export const publicSitemap = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { courses, bundles } = await coursesService.getSitemapEntries();
    const base = process.env.ACADEMY_URL || 'https://akademia.kosmetologwiktoriacwik.pl';
    const fixed = ['', 'regulamin', 'polityka-prywatnosci', 'cookies', 'odstapienie', 'reklamacje', 'dostepnosc'];
    const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]!);
    const urls = [...fixed.map((path) => ({ loc: `${base}/${path}`, updatedAt: null as Date | null })), ...courses.map((course) => ({ loc: `${base}/kurs/${course.slug}`, updatedAt: course.updatedAt })), ...bundles.map((bundle) => ({ loc: `${base}/pakiet/${bundle.slug}`, updatedAt: bundle.updatedAt }))];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((item) => `  <url><loc>${escapeXml(item.loc)}</loc>${item.updatedAt ? `<lastmod>${item.updatedAt.toISOString()}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`;
    res.type('application/xml').send(xml);
  } catch (error) { next(error); }
};

export const listPublished = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.academyUser!.id;
    const courses = await coursesService.listPublished(userId, req.academyUser!.role === 'ADMIN');
    res.json({ data: courses });
  } catch (error) {
    next(error);
  }
};

export const getCourseBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.academyUser!.id;
    const course = await coursesService.getCourseBySlug(req.params.slug, userId, req.academyUser!.role === 'ADMIN');
    res.json({ data: course });
  } catch (error) {
    next(error);
  }
};

export const registerInterest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await coursesService.registerCourseInterest(req.academyUser!.id, req.params.courseId);
    res.status(result.status === 'ENROLLED' ? 201 : 202).json({ data: result });
  } catch (error) { next(error); }
};
export const listFavorites = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await coursesService.listFavorites(req.academyUser!.id) }); } catch (error) { next(error); } };
export const addFavorite = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ data: await coursesService.addFavorite(req.academyUser!.id, req.params.courseId) }); } catch (error) { next(error); } };
export const removeFavorite = async (req: Request, res: Response, next: NextFunction) => { try { await coursesService.removeFavorite(req.academyUser!.id, req.params.courseId); res.status(204).end(); } catch (error) { next(error); } };
export const submitReview = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ data: await coursesService.submitReview(req.academyUser!.id, req.params.courseId, Number(req.body.rating), String(req.body.content || '').trim()) }); } catch (error) { next(error); } };
export const adminListReviews = async (_req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await coursesService.adminListReviews() }); } catch (error) { next(error); } };
export const adminApproveReview = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ data: await coursesService.adminApproveReview(req.params.id, Boolean(req.body.isApproved)) }); } catch (error) { next(error); } };

export const adminListAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await coursesService.adminListAll();
    res.json({ data: courses });
  } catch (error) {
    next(error);
  }
};

export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await coursesService.createCourse(req.body);
    res.status(201).json({ data: course });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await coursesService.updateCourse(req.params.id, req.body);
    res.json({ data: course });
  } catch (error) {
    next(error);
  }
};

export const adminListBundles = async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await coursesService.adminListBundles() }); } catch (error) { next(error); }
};

export const createBundle = async (req: Request, res: Response, next: NextFunction) => {
  try { res.status(201).json({ data: await coursesService.createBundle(req.body) }); } catch (error) { next(error); }
};

export const updateBundle = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await coursesService.updateBundle(req.params.id, req.body) }); } catch (error) { next(error); }
};

export const deleteBundle = async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ data: await coursesService.deleteBundle(req.params.id) }); } catch (error) { next(error); }
};

export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await coursesService.deleteCourse(req.params.id);
    res.json({ message: 'Kurs usunięty' });
  } catch (error) {
    next(error);
  }
};

export const reorderModules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await coursesService.reorderModules(req.params.id, req.body.order);
    res.json({ message: 'Kolejność modułów zaktualizowana' });
  } catch (error) {
    next(error);
  }
};

export const reorderLessons = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await coursesService.reorderLessons(req.params.id, req.body.order);
    res.json({ message: 'Kolejność lekcji zaktualizowana' });
  } catch (error) {
    next(error);
  }
};

export const createModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mod = await coursesService.createModule(req.params.courseId, req.body);
    res.status(201).json({ data: mod });
  } catch (error) {
    next(error);
  }
};

export const updateModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mod = await coursesService.updateModule(req.params.moduleId, req.body);
    res.json({ data: mod });
  } catch (error) {
    next(error);
  }
};

export const deleteModule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await coursesService.deleteModule(req.params.moduleId);
    res.json({ message: 'Moduł usunięty' });
  } catch (error) {
    next(error);
  }
};

export const createCheckpoint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const checkpoint = await coursesService.createCheckpoint(req.params.moduleId, req.body);
    res.status(201).json({ data: checkpoint });
  } catch (error) {
    next(error);
  }
};
