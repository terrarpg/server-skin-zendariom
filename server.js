const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/skins', express.static('public/skins'));
app.use('/capes', express.static('public/capes'));

// Configuration GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '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';
const GITHUB_REPO = 'terrarpg/server-skin-zendariom';
const GITHUB_BRANCH = 'main';
const PLAYERS_JSON_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/player.json`;

// Configuration Multer pour upload
const storage = multer.memoryStorage(); // Stocker en mémoire pour traitement
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Seulement les images (PNG) sont autorisées'), false);
        }
    }
});

// Créer les dossiers nécessaires
const directories = ['public/skins', 'public/capes', 'temp'];
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Fonction pour lire le fichier JSON depuis GitHub
async function getPlayersFromGitHub() {
    try {
        const response = await axios.get(PLAYERS_JSON_URL);
        return response.data || {};
    } catch (error) {
        console.log('Création d\'un nouveau fichier players.json');
        return { players: {} };
    }
}

// Fonction pour sauvegarder sur GitHub
async function saveToGitHub(data, commitMessage) {
    try {
        // Convertir en JSON formaté
        const content = JSON.stringify(data, null, 2);
        const contentBase64 = Buffer.from(content).toString('base64');
        
        // Récupérer le SHA du fichier existant
        let sha = '';
        try {
            const fileInfo = await axios.get(
                `https://api.github.com/repos/${GITHUB_REPO}/contents/player.json`,
                {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );
            sha = fileInfo.data.sha;
        } catch (error) {
            // Fichier n'existe pas encore
        }
        
        // Mettre à jour le fichier
        const response = await axios.put(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/player.json`,
            {
                message: commitMessage,
                content: contentBase64,
                sha: sha || undefined,
                branch: GITHUB_BRANCH
            },
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('Fichier sauvegardé sur GitHub:', commitMessage);
        return true;
    } catch (error) {
        console.error('Erreur GitHub:', error.response?.data || error.message);
        return false;
    }
}

// Fonction pour optimiser et sauvegarder le skin
async function processAndSaveSkin(imageBuffer, username, type = 'skin') {
    try {
        // Créer un nom de fichier unique
        const timestamp = Date.now();
        const hash = crypto.createHash('md5').update(`${username}_${timestamp}`).digest('hex');
        const filename = `${type}_${hash}.png`;
        const filepath = path.join('public', type === 'skin' ? 'skins' : 'capes', filename);
        
        // Optimiser l'image avec Sharp
        await sharp(imageBuffer)
            .resize(type === 'skin' ? 64 : 64, type === 'skin' ? 64 : 32, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toFile(filepath);
        
        console.log(`${type} sauvegardé:`, filename);
        return filename;
    } catch (error) {
        console.error(`Erreur traitement ${type}:`, error);
        throw error;
    }
}

// Routes

// Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Page d'upload
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// API: Upload skin
app.post('/api/upload', upload.fields([
    { name: 'skin', maxCount: 1 },
    { name: 'cape', maxCount: 1 }
]), async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username || username.trim() === '') {
            return res.status(400).json({ error: 'Nom d\'utilisateur requis' });
        }
        
        // Vérifier format username Minecraft
        if (!/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
            return res.status(400).json({ 
                error: 'Nom d\'utilisateur invalide (3-16 caractères, lettres, chiffres, underscores)' 
            });
        }
        
        console.log(`Upload demandé pour: ${username}`);
        
        // Récupérer les données actuelles
        const playersData = await getPlayersFromGitHub();
        
        // Traiter le skin
        let skinFilename = null;
        if (req.files && req.files['skin']) {
            skinFilename = await processAndSaveSkin(
                req.files['skin'][0].buffer, 
                username, 
                'skin'
            );
        }
        
        // Traiter la cape
        let capeFilename = null;
        if (req.files && req.files['cape']) {
            capeFilename = await processAndSaveSkin(
                req.files['cape'][0].buffer, 
                username, 
                'cape'
            );
        }
        
        // Mettre à jour les données
        const playerData = {
            username: username,
            skin: skinFilename || (playersData.players[username]?.skin || null),
            cape: capeFilename || (playersData.players[username]?.cape || null),
            lastUpdate: new Date().toISOString()
        };
        
        // S'assurer que players existe
        if (!playersData.players) {
            playersData.players = {};
        }
        
        playersData.players[username] = playerData;
        
        // Sauvegarder sur GitHub
        const success = await saveToGitHub(
            playersData,
            `Mise à jour skin pour ${username}`
        );
        
        if (!success) {
            return res.status(500).json({ error: 'Erreur de sauvegarde sur GitHub' });
        }
        
        res.json({
            success: true,
            message: 'Skin/Cape uploadé avec succès!',
            data: playerData,
            urls: {
                skin: skinFilename ? `/skins/${skinFilename}` : null,
                cape: capeFilename ? `/capes/${capeFilename}` : null
            }
        });
        
    } catch (error) {
        console.error('Erreur upload:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
});

// API: Récupérer un skin
app.get('/api/skin/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const playersData = await getPlayersFromGitHub();
        
        if (playersData.players && playersData.players[username] && playersData.players[username].skin) {
            const skinFile = playersData.players[username].skin;
            const skinPath = path.join(__dirname, 'public', 'skins', skinFile);
            
            if (fs.existsSync(skinPath)) {
                res.sendFile(skinPath);
            } else {
                // Skin par défaut
                res.sendFile(path.join(__dirname, 'public', 'defaults', 'steve.png'));
            }
        } else {
            // Skin par défaut
            res.sendFile(path.join(__dirname, 'public', 'defaults', 'steve.png'));
        }
    } catch (error) {
        console.error('Erreur récupération skin:', error);
        res.sendFile(path.join(__dirname, 'public', 'defaults', 'steve.png'));
    }
});

// API: Récupérer une cape
app.get('/api/cape/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const playersData = await getPlayersFromGitHub();
        
        if (playersData.players && playersData.players[username] && playersData.players[username].cape) {
            const capeFile = playersData.players[username].cape;
            const capePath = path.join(__dirname, 'public', 'capes', capeFile);
            
            if (fs.existsSync(capePath)) {
                res.sendFile(capePath);
            } else {
                res.status(404).send('Cape non trouvée');
            }
        } else {
            res.status(404).send('Cape non trouvée');
        }
    } catch (error) {
        console.error('Erreur récupération cape:', error);
        res.status(500).send('Erreur serveur');
    }
});

// API: Récupérer les infos d'un joueur
app.get('/api/player/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const playersData = await getPlayersFromGitHub();
        
        if (playersData.players && playersData.players[username]) {
            const player = playersData.players[username];
            res.json({
                success: true,
                player: {
                    username: player.username,
                    skin: player.skin ? `/skins/${player.skin}` : null,
                    cape: player.cape ? `/capes/${player.cape}` : null,
                    lastUpdate: player.lastUpdate
                }
            });
        } else {
            res.json({
                success: false,
                message: 'Joueur non trouvé'
            });
        }
    } catch (error) {
        console.error('Erreur récupération joueur:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// API: Liste tous les joueurs
app.get('/api/players', async (req, res) => {
    try {
        const playersData = await getPlayersFromGitHub();
        res.json({
            success: true,
            players: playersData.players || {}
        });
    } catch (error) {
        console.error('Erreur liste joueurs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur skins démarré sur http://localhost:${PORT}`);
    console.log(`📁 GitHub: ${GITHUB_REPO}`);
});
