
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/require-await */
import type { NextApiRequest, NextApiResponse } from "next";
import { join } from "path";
import * as dateFn from "date-fns";
import formidable from "formidable";
import { mkdir, stat } from "fs/promises";
import mime from 'mime'



export const parseForm = async (
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> => {
  return new Promise(async (resolve, reject) => {

    const uploadDir = join(
      process.env.ROOT_DIR || process.cwd(),
      `/public/uploads`
    )

    try {
      await stat(uploadDir)
    } catch (e: any) {
      if (e.code === "ENOENT") {
        await mkdir(uploadDir, { recursive: true });
      } else {
        console.error(e);
        reject(e);
        return;
      }
    }
    const form = formidable({
      maxFiles: 2,
      maxFileSize: 1024 * 1024 * 5, // 1mb
      uploadDir,
      filename: (_name, _ext, part) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const filename = `${part.name || "unknown"}-${uniqueSuffix}.${mime.getExtension(part.mimetype || "") || "unknown"}`;
        return filename;
      },
      filter: (part) => {
        return (
          part.name === "file" && (part.mimetype?.includes("image") || false)
        );
      },
    });

    form.parse(req, function (err, fields, files) {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<{
    data: {
      url: string|string[]
    } | null;
    error: string | null
  }>
) => {

  if (req.method !== 'POST') {
    res.setHeader("Allow", "POST");
    res.status(405).json({
      data: null,
      error: "Method Not allowed"
    });
    return;
  }

  try {
    const { fields, files } = await parseForm(req);

    const file = files.file;
    // console.log({file})
    const url = Array.isArray(file) ? file.map((f) => `/uploads/${f.newFilename}`) : `/uploads/${file?.newFilename}`;

    res.status(200).json({
      data: url ? {
        url,
      } : null,
      error: null,
    });
  } catch (e) {
    if (e instanceof formidable.errors.FormidableError) {
      res.status(e.httpCode || 400).json({ data: null, error: e.message });
    } else {
      console.error(e);
      res.status(500).json({ data: null, error: "Internal Server Error" });
    }
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;