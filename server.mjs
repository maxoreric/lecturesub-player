import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve dist and public
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Multer storage configuration
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const id = req.body.id || `lec_${Date.now()}`;
        const dir = path.join(__dirname, 'public', 'uploads', id);
        await fs.ensureDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// API: Handle Multi-file Upload
app.post('/api/upload', upload.fields([
    { name: 'videoPPT', maxCount: 1 },
    { name: 'videoTeacher', maxCount: 1 },
    { name: 'subtitleVTT', maxCount: 1 }
]), async (req, res) => {
    try {
        const { id, title } = req.body;
        const files = req.files;

        if (!title || !files.videoPPT || !files.videoTeacher || !files.subtitleVTT) {
            return res.status(400).json({ error: 'Missing title or files' });
        }

        const lectureId = id || `lec_${Date.now()}`;
        const lectureData = {
            id: lectureId,
            title: title,
            vPPT: `/uploads/${lectureId}/${files.videoPPT[0].originalname}`,
            vTeacher: `/uploads/${lectureId}/${files.videoTeacher[0].originalname}`,
            vtt: `/uploads/${lectureId}/${files.subtitleVTT[0].originalname}`
        };

        // Update lectures.json
        const jsonPath = path.join(__dirname, 'public', 'lectures.json');

        // Ensure json exists
        if (!await fs.pathExists(jsonPath)) {
            await fs.writeJson(jsonPath, [], { spaces: 2 });
        }

        const lectures = await fs.readJson(jsonPath);
        lectures.push(lectureData);
        await fs.writeJson(jsonPath, lectures, { spaces: 2 });

        res.json({ success: true, lecture: lectureData });
    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ error: 'Server upload failed' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
