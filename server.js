const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const GITHUB_TOKEN = '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';
const GITHUB_REPO = 'terrarpg/server-skin-zendariom';
const GITHUB_OWNER = 'terrarpg';
const GITHUB_API = 'https://api.github.com';

// Configuration Multer pour l'upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, cb) => {
        const uuid = req.body.uuid || crypto.randomBytes(16).toString('hex');
        const type = req.body.type || 'skin';
        const timestamp = Date.now();
        const filename = `${type}_${uuid}_${timestamp}.png`;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Seuls les fichiers PNG sont autorisés'), false);
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes API
app.post('/api/upload/:type', upload.single('file'), async (req, res) => {
    try {
        const { type } = req.params;
        const { username, uuid, animated, source = 'upload' } = req.body;
        
        if (!username || !uuid) {
            return res.status(400).json({ error: 'Username et UUID requis' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier uploadé' });
        }

        // Lire le fichier
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileSize = fileBuffer.length;
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);

        // Créer l'objet JSON
        const jsonData = {
            username,
            uuid,
            size: fileSize,
            hash: fileHash,
            lastDownload: new Date().toISOString(),
            animated: animated === 'true',
            source
        };

        // Sauvegarder sur GitHub
        const githubResponse = await saveToGitHub(type, username, uuid, jsonData, fileBuffer);

        // Nettoyer le fichier local
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: `${type} uploadé avec succès`,
            github: githubResponse,
            data: jsonData
        });

    } catch (error) {
        console.error('Erreur upload:', error);
        res.status(500).json({ 
            error: 'Erreur lors de l\'upload',
            details: error.message 
        });
    }
});

app.get('/api/skin/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const skinData = await getFromGitHub('skin', uuid);
        
        if (!skinData) {
            return res.status(404).json({ error: 'Skin non trouvé' });
        }

        res.json(skinData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/cape/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const capeData = await getFromGitHub('cape', uuid);
        
        if (!capeData) {
            return res.status(404).json({ error: 'Cape non trouvé' });
        }

        res.json(capeData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/history/:type/:uuid', async (req, res) => {
    try {
        const { type, uuid } = req.params;
        const history = await getHistoryFromGitHub(type, uuid);
        
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/all-skins', async (req, res) => {
    try {
        const allSkins = await getAllFromGitHub('skin');
        res.json(allSkins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/all-capes', async (req, res) => {
    try {
        const allCapes = await getAllFromGitHub('cape');
        res.json(allCapes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route pour récupérer le fichier player.json
app.get('/api/players', async (req, res) => {
    try {
        const players = await getPlayersJson();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route principale - Interface web
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fonctions GitHub
async function saveToGitHub(type, username, uuid, jsonData, fileBuffer) {
    const timestamp = Date.now();
    const filename = `${type}-server-${uuid}.json`;
    const imageFilename = `${type}-${uuid}.png`;
    
    // 1. Sauvegarder le JSON
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const jsonPath = `skins/${username}/${filename}`;
    
    await updateGitHubFile(jsonPath, jsonContent, `Update ${type} for ${username}`);
    
    // 2. Sauvegarder l'image
    const imagePath = `skins/${username}/${imageFilename}`;
    const imageBase64 = fileBuffer.toString('base64');
    
    await updateGitHubFile(imagePath, imageBase64, `Update ${type} image for ${username}`, true);
    
    // 3. Mettre à jour player.json
    await updatePlayerJson(username, uuid, type, {
        ...jsonData,
        imageUrl: `https://raw.githubusercontent.com/${GITHUB_REPO}/main/${imagePath}`
    });

    return { jsonPath, imagePath };
}

async function getFromGitHub(type, uuid) {
    try {
        const response = await axios.get(
            `https://raw.githubusercontent.com/${GITHUB_REPO}/main/skins/${uuid}/${type}-server-${uuid}.json`,
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );
        return response.data;
    } catch (error) {
        return null;
    }
}

async function getHistoryFromGitHub(type, uuid) {
    try {
        const response = await axios.get(
            `${GITHUB_API}/repos/${GITHUB_REPO}/contents/skins/${uuid}`,
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );
        
        const files = response.data.filter(file => 
            file.name.startsWith(`${type}-server`) && file.name.endsWith('.json')
        );
        
        const history = [];
        for (const file of files) {
            const fileResponse = await axios.get(file.download_url);
            history.push(fileResponse.data);
        }
        
        return history.sort((a, b) => 
            new Date(b.lastDownload) - new Date(a.lastDownload)
        );
    } catch (error) {
        return [];
    }
}

async function getAllFromGitHub(type) {
    try {
        const response = await axios.get(
            `${GITHUB_API}/repos/${GITHUB_REPO}/contents/skins`,
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );
        
        const allData = [];
        
        for (const userDir of response.data) {
            if (userDir.type === 'dir') {
                try {
                    const userFiles = await axios.get(
                        `${GITHUB_API}/repos/${GITHUB_REPO}/contents/skins/${userDir.name}`,
                        { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
                    );
                    
                    const userFile = userFiles.data.find(file => 
                        file.name.startsWith(`${type}-server`) && file.name.endsWith('.json')
                    );
                    
                    if (userFile) {
                        const fileResponse = await axios.get(userFile.download_url);
                        allData.push(fileResponse.data);
                    }
                } catch (e) {
                    // Continuer avec le prochain utilisateur
                }
            }
        }
        
        return allData;
    } catch (error) {
        return [];
    }
}

async function getPlayersJson() {
    try {
        const response = await axios.get(
            `https://raw.githubusercontent.com/${GITHUB_REPO}/main/players.json`,
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );
        return response.data;
    } catch (error) {
        // Si le fichier n'existe pas, le créer
        return { players: [] };
    }
}

async function updatePlayerJson(username, uuid, type, data) {
    const players = await getPlayersJson();
    
    let playerIndex = players.players.findIndex(p => p.uuid === uuid);
    
    if (playerIndex === -1) {
        players.players.push({
            username,
            uuid,
            skins: [],
            capes: []
        });
        playerIndex = players.players.length - 1;
    }
    
    const player = players.players[playerIndex];
    player.username = username; // Mettre à jour le nom si changé
    
    if (type === 'skin') {
        player.skins = player.skins || [];
        const existingIndex = player.skins.findIndex(s => s.hash === data.hash);
        if (existingIndex === -1) {
            player.skins.unshift(data);
            // Garder seulement les 10 derniers skins
            if (player.skins.length > 10) {
                player.skins = player.skins.slice(0, 10);
            }
        }
    } else if (type === 'cape') {
        player.capes = player.capes || [];
        const existingIndex = player.capes.findIndex(c => c.hash === data.hash);
        if (existingIndex === -1) {
            player.capes.unshift(data);
            // Garder seulement les 10 dernières capes
            if (player.capes.length > 10) {
                player.capes = player.capes.slice(0, 10);
            }
        }
    }
    
    // Sauvegarder sur GitHub
    await updateGitHubFile('players.json', JSON.stringify(players, null, 2), `Update player ${username}`);
}

async function updateGitHubFile(path, content, message, isBase64 = false) {
    try {
        // Vérifier si le fichier existe déjà
        let sha = null;
        try {
            const existingFile = await axios.get(
                `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${path}`,
                { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
            );
            sha = existingFile.data.sha;
        } catch (e) {
            // Fichier n'existe pas encore
        }
        
        const data = {
            message,
            content: isBase64 ? content : Buffer.from(content).toString('base64'),
            sha
        };
        
        const response = await axios.put(
            `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${path}`,
            data,
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
        );
        
        return response.data;
    } catch (error) {
        console.error('Erreur GitHub:', error.response?.data || error.message);
        throw error;
    }
}

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log(`Interface web disponible sur http://localhost:${PORT}`);
    console.log(`API disponible sur http://localhost:${PORT}/api`);
});
