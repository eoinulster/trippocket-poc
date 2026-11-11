import { initDatabase } from "../server/database.mjs";
if (await initDatabase()) console.log("TripPocket database tables ready.");
else console.log("No DATABASE_URL set. Local JSON storage will be used.");
