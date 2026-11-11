import { send } from "../server/http.mjs";
import { databaseURL, modelKey } from "../server/config.mjs";
export default function handler(req, res) {
  return send(res, 200, {
    ok: true,
    storage: databaseURL() ? "cloud" : "local",
    ai: !!modelKey(),
    prototype: true,
  });
}
