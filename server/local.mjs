import { createServer } from "node:http";
import wallet from "../api/wallet.mjs";
import extract from "../api/extract.mjs";
import health from "../api/health.mjs";
const routes = {
  "/api/wallet": wallet,
  "/api/extract": extract,
  "/api/health": health,
};
const server = createServer(async (req, res) => {
  const route = routes[new URL(req.url, "http://localhost").pathname];
  if (route) await route(req, res);
  else {
    res.statusCode = 404;
    res.end("Not found");
  }
});
server.listen(8787, "127.0.0.1", () =>
  console.log("TripPocket API ready at http://127.0.0.1:8787"),
);
