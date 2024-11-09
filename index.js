const express = require('express');
const app = express();
const PORT = 3210;

app.use(express.json());
app.use(express.static('public'));

app.get('/', function (req, res) {
    res.send("<a href='outlier-plugin.mjs'>outlier-plugin.mjs</a><br><a href='outlier-plugin.cjs'>outlier-plugin.cjs</a>");
});
app.listen(PORT, function (err) {
    if (err) console.log(err);
    console.log("Server listening on http://localhost:" + PORT);
});