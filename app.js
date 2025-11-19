const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
const webhook_routes = require('./routes/webhook');

app.use(express.static("public"));

app.use('/api', webhook_routes);

// Sample route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});