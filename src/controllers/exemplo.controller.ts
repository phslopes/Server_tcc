import { Request, Response } from "express";
import { db } from "../config/db";

export const getExemplo = async (req: Request, res: Response) => {
  const [rows] = await db.query("SELECT NOW() AS agora");
  res.json(rows);
};
