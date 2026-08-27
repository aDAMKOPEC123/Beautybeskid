import { Request, Response, NextFunction } from 'express';
import { listBlocks, createBlock, deleteBlock } from './calendar-blocks.service';

export const handleListBlocks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) {
      res.status(400).json({ message: 'Wymagane parametry from i to' });
      return;
    }
    res.json(await listBlocks(from, to));
  } catch (err) {
    next(err);
  }
};

export const handleCreateBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const block = await createBlock(req.body, userId);
    res.status(201).json(block);
  } catch (err) {
    next(err);
  }
};

export const handleDeleteBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await deleteBlock(req.params.id));
  } catch (err) {
    next(err);
  }
};
