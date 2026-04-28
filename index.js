const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.static('public'));

// 画像URLをBase64文字列に変換するプロキシ関数
async function getBase64(url) {
    if (!url) return null;
    try {
        const res = await axios.get(url, { 
            responseType: 'arraybuffer', 
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const contentType = res.headers['content-type'];
        const base64 = Buffer.from(res.data).toString('base64');
        return `data:${contentType};base64,${base64}`;
    } catch (e) {
        console.error(`Image Fetch Error: ${url}`, e.message);
        return null;
    }
}

// ルートアクセス時に index.html を返す
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 検索APIプロキシ
app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    try {
        const target = `https://muhoweb-teoj.onrender.com/api/v3/djsearch?q=${encodeURIComponent(q)}`;
        const response = await axios.get(target);
        const results = response.data.result || [];
        
        // 検索結果のサムネイルをBase64化
        const processed = await Promise.all(results.map(async (item) => ({
            ...item,
            image: await getBase64(item.image)
        })));
        
        res.json({ result: processed });
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// 詳細APIプロキシ (imageUrlsを全Base64化)
app.get('/api/detail', async (req, res) => {
    const { id, rule } = req.query;
    try {
        const target = `https://muhoweb-teoj.onrender.com/api/v3/dj?id=${id}&rule=${rule}`;
        const response = await axios.get(target);
        const data = response.data.data;

        // 全ページの画像を並列でBase64化
        if (data && data.imageUrls) {
            data.imageUrlsBase64 = await Promise.all(
                data.imageUrls.map(url => getBase64(url))
            );
        }

        res.json({ ...response.data, data });
    } catch (error) {
        res.status(500).json({ error: 'Detail fetch failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
