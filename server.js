require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const pool = require('./config/db');

const app = express();

// --- 1. KONFIGURASI AWS S3 CLIENT ---
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

// --- 2. VALIDASI FORMAT GAMBAR ---
const imageFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new Error('Hanya file gambar yang diizinkan!'), false);
    }
    cb(null, true);
};

// --- 3. KONFIGURASI MULTER S3 (HANYA SATU SAJA) ---
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        acl: 'public-read',
        contentType: multerS3.AUTO_CONTENT_TYPE, // PENTING: Agar gambar tampil di browser
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            cb(null, `uploads/${Date.now().toString()}-${file.originalname}`);
        }
    }),
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Batas 5MB
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- ROUTES ---

app.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
        res.render('index', { reports: rows });
    } catch (err) {
        res.status(500).send("DB Error");
    }
});

app.post('/report', upload.single('image'), async (req, res) => {
    const { title, description, location, latitude, longitude } = req.body;
    const imageUrl = req.file ? req.file.location : null; // URL S3

    try {
        const sql = `INSERT INTO reports (title, description, location_name, latitude, longitude, image_url) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool.query(sql, [title, description, location, latitude, longitude, imageUrl]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Simpan Gagal. Cek Kredensial AWS.");
    }
});

app.get('/reports', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reports');
        res.render('reports', { reports: rows });
    } catch (err) {
        res.status(500).send("Peta Gagal");
    }
});

app.get('/reports/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM reports WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).send("Not Found");
        res.render('detail', { report: rows[0] });
    } catch (err) {
        res.status(500).send("Error");
    }
});

app.post('/reports/:id/verify', upload.single('evidence'), async (req, res) => {
    const evidenceUrl = req.file ? req.file.location : null;
    try {
        await pool.query('UPDATE reports SET status = ?, evidence_url = ? WHERE id = ?', 
        ['Selesai', evidenceUrl, req.params.id]);
        res.redirect(`/reports/${req.params.id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Update Gagal");
    }
});
app.listen(80, () => console.log(' Jalan di port 80'));

// --- 6. HAPUS LAPORAN ---
app.post('/reports/:id/delete', async (req, res) => {
    try {
        // (Opsional) Jika ingin menghapus file di S3 juga, kamu butuh DeleteObjectCommand dari AWS SDK.
        // Untuk sekarang, kita hapus record dari database saja.
        await pool.query('DELETE FROM reports WHERE id = ?', [req.params.id]);
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Gagal menghapus laporan.");
    }
});