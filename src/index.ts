import express from "express";
import { db } from "./config/database";
import exemploRoutes from "./routes/exemplo.routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/exemplo", exemploRoutes);

// Teste de conexão
db.getConnection()
  .then(conn => {
    console.log("MySQL conectado!");
    conn.release();
  })
  .catch(err => console.error("Erro MySQL:", err));

app.listen(PORT, () =>
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
);
