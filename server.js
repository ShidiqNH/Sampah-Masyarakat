require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const pool = require('./config/db');

const app = express();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. INDEX
app.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
        res.render('index', { reports: rows });
    } catch (err) {
        res.status(500).send("DB Error");
    }
});

// 2. LAPOR
app.post('/report', upload.single('image'), async (req, res) => {
    const { title, description, location, latitude, longitude } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const sql = `INSERT INTO reports (title, description, location_name, latitude, longitude, image_url) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [title, description, location, latitude, longitude, imageUrl]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Simpan Gagal");
    }
});

// 3. DASHBOARD MAP
app.get('/reports', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reports');
        res.render('reports', { reports: rows });
    } catch (err) {
        res.status(500).send("Peta Gagal");
    }
});

// 4. DETAIL
app.get('/reports/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reports WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).send("Not Found");
        res.render('detail', { report: rows[0] });
    } catch (err) {
        res.status(500).send("Error");
    }
});

// 5. VERIFIKASI
app.post('/reports/:id/verify', upload.single('evidence'), async (req, res) => {
    const evidenceUrl = req.file ? `/uploads/${req.file.filename}` : null;
    try {
        await pool.query('UPDATE reports SET status = ?, evidence_url = ? WHERE id = ?', 
        ['Selesai', evidenceUrl, req.params.id]);
        res.redirect(`/reports/${req.params.id}`);
    } catch (err) {
        res.status(500).send("Update Gagal");
    }
});

app.listen(3000, () => console.log('🚀 Web Jalan di http://localhost:3000'));