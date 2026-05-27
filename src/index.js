import express from "express";

const app = express();
const port = 8000;

// parse JSON request bodies
app.use(express.json());

// root route
app.get("/", (req, res) => {
  res.json({ message: "Hello from Express on port 8000!" });
});

// start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
