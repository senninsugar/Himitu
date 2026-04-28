const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// API検索 + 画像Base64変換プロキシ
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const targetUrl = `https://muhoweb-teoj.onrender.com/api/v3/djsearch?q=${encodeURIComponent(query)}`;

    try {
        const response = await axios.get(targetUrl);
        const results = response.data.result;

        // 各アイテムの画像をBase64に変換
        const processedResults = await Promise.all(results.map(async (item) => {
            try {
                const imgRes = await axios.get(item.image, { responseType: 'arraybuffer' });
                const base64Img = `data:${imgRes.headers['content-type']};base64,${Buffer.from(imgRes.data).toString('base64')}`;
                return { ...item, image: base64Img };
            } catch (e) {
                return { ...item, image: null }; // 画像取得失敗時
            }
        }));

        res.json({ result: processedResults });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
