import { errorResponse, parseQuery } from "@/lib/api";
import { getPreview, gmailFor, listAllIds } from "@/lib/gmail";

const SAMPLE_SIZE = 50;

export async function POST(req: Request) {
  try {
    const query = await parseQuery(req.clone());
    const gmail = await gmailFor(req);
    const ids = await listAllIds(gmail, query);
    const sample = await getPreview(gmail, ids.slice(0, SAMPLE_SIZE));
    return Response.json({ query, totalCount: ids.length, sample });
  } catch (err) {
    return errorResponse(err);
  }
}
