import app from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`Vertex Medical API running on port ${env.PORT}`);
});
