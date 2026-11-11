import { ownerKey, readWallet, saveWallet } from "../server/database.mjs";
import { validateWallet } from "../server/validation.mjs";
import { bodyJSON, send, sameOrigin, handleError } from "../server/http.mjs";
export default async function handler(req, res) {
  try {
    sameOrigin(req);
    const owner = ownerKey(req.headers["x-wallet-token"]);
    if (req.method === "GET")
      return send(res, 200, { wallet: await readWallet(owner) });
    if (req.method !== "PUT")
      return send(res, 405, { error: "Method not allowed." });
    const body = await bodyJSON(req);
    let wallet;
    try {
      wallet = validateWallet(body.wallet);
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
    await saveWallet(owner, wallet);
    return send(res, 200, { saved: true });
  } catch (e) {
    return handleError(res, e);
  }
}
