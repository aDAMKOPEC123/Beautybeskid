import { NextFunction, Request, Response } from 'express';
import * as service from './analytics.service';
export const track = async (req:Request,res:Response,next:NextFunction)=>{try{await service.track(req.body,req.academyUser?.id);res.status(202).json({data:{accepted:true}});}catch(error){next(error);}};
export const dashboard = async (req:Request,res:Response,next:NextFunction)=>{try{res.json({data:await service.dashboard(Number(req.query.days)||30)});}catch(error){next(error);}};
export const customers = async (req:Request,res:Response,next:NextFunction)=>{try{res.json({data:await service.customers(String(req.query.search||''))});}catch(error){next(error);}};
export const grantCourse = async (req:Request,res:Response,next:NextFunction)=>{try{await service.grantCourse(req.params.userId,req.body.courseId);res.json({data:{granted:true}});}catch(error){next(error);}};
export const revokeCourse = async (req:Request,res:Response,next:NextFunction)=>{try{await service.revokeCourse(req.params.userId,req.params.courseId);res.json({data:{revoked:true}});}catch(error){next(error);}};
