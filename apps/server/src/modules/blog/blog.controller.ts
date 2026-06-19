// filepath: apps/server/src/modules/blog/blog.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as blogService from './blog.service';
import { createBlogPostSchema, updateBlogPostSchema } from '@cosmo/shared';
import { processAndSaveImage } from '../../utils/imageProcessor';
import { AppError } from '../../middleware/error.middleware';

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const userId = req.user?.id;
    const posts = await blogService.getAllPosts(isAdmin, userId);
    res.status(200).json({ status: 'success', data: { posts } });
  } catch (error) {
    next(error);
  }
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const post = await blogService.getPostBySlug(req.params.slug, userId);
    // If not published and not admin, forbid
    if (!post.isPublished && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ status: 'error', message: 'Brak dostępu' });
    }
    res.status(200).json({ status: 'success', data: { post } });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let dataToValidate;
    try {
      dataToValidate = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    } catch {
      throw new AppError('Nieprawidłowy format danych JSON', 400);
    }
    
    if (dataToValidate.isPublished !== undefined) {
      dataToValidate.isPublished = dataToValidate.isPublished === 'true' || dataToValidate.isPublished === true;
    }

    const validatedData = createBlogPostSchema.parse(dataToValidate);

    let post = await blogService.createPost(req.user!.id, validatedData);

    if (req.file) {
      const imagePath = await processAndSaveImage(req.file.buffer, 'blog');
      post = await blogService.updatePostImage(post.id, imagePath);
    }

    res.status(201).json({ status: 'success', data: { post } });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let dataToValidate;
    try {
      dataToValidate = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body;
    } catch {
      throw new AppError('Nieprawidłowy format danych JSON', 400);
    }
    
    if (dataToValidate.isPublished !== undefined) {
      dataToValidate.isPublished = dataToValidate.isPublished === 'true' || dataToValidate.isPublished === true;
    }

    const validatedData = updateBlogPostSchema.parse(dataToValidate);
    let post = await blogService.updatePost(req.params.id, validatedData);

    if (req.file) {
      const imagePath = await processAndSaveImage(req.file.buffer, 'blog');
      post = await blogService.updatePostImage(post.id, imagePath);
    }

    res.status(200).json({ status: 'success', data: { post } });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await blogService.deletePost(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const uploadInlineImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ status: 'error', message: 'Brak pliku' });
    const url = await processAndSaveImage(req.file.buffer, 'blog');
    res.status(200).json({ status: 'success', data: { url } });
  } catch (error) {
    next(error);
  }
};

export const likePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await blogService.toggleLike(req.params.slug, req.user!.id);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
};
