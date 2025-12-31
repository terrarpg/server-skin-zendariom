const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Dossiers
const SKINS_DIR = 'public/skins';
const CAPES_DIR = 'public/capes';
const DEFAULTS_DIR = 'public/defaults';

// Créer les dossiers
[SKINS_DIR, CAPES_DIR, DEFAULTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Créer un skin par défaut si nécessaire
const defaultSkinPath = path.join(DEFAULTS_DIR, 'steve.png');
if (!fs.existsSync(defaultSkinPath)) {
    // Créer un skin Steve par défaut (image 64x64 pixels)
    const defaultSkin = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA' +
        'B3RJTUUH5gIHAgMVp0tT4wAAABl0RVh0Q29tbWVudABDcmVhdGVkIHdpdGggR0lNUFeBDhcAAAAN' +
        'SURBVFjD7cExAQAAAMKg9U9tCl8gAAAAAElFTkSuQmCC',
        'base64'
    );
    fs.writeFileSync(defaultSkinPath, defaultSkin);
}

// Configuration Multer
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Seulement les fichiers PNG sont autorisés'), false);
        }
    }
});

// Base de données locale (JSON)
const DB_FILE = 'database.json';
let database = {
    players: {},
    lastUpdate: new Date().toISOString()
};

// Charger la base de données
function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            database = JSON.parse(data);
            console.log(`Base de données chargée: ${Object.keys(database.players).length} joueurs`);
        }
    } catch (error) {
        console.error('Erreur chargement base de données:', error);
        saveDatabase(); // Créer une nouvelle base
    }
}

// Sauvegarder la base de données
function saveDatabase() {
    try {
        database.lastUpdate = new Date().toISOString();
        fs.writeFileSync(DB_FILE, JSON.stringify(database, null, 2), 'utf8');
        console.log('Base de données sauvegardée');
    } catch (error) {
        console.error('Erreur sauvegarde base de données:', error);
    }
}

// Initialiser
loadDatabase();

// Fonction pour traiter et sauvegarder une image
async function processAndSaveImage(imageBuffer, username, type = 'skin') {
    try {
        // Créer un hash unique pour le fichier
        const timestamp = Date.now();
        const hash = crypto.createHash('md5').update(`${username}_${timestamp}`).digest('hex').substring(0, 8);
        const filename = `${type}_${username}_${hash}.png`;
        
        const targetDir = type === 'skin' ? SKINS_DIR : CAPES_DIR;
        const filepath = path.join(targetDir, filename);
        
        // Dimensions selon le type
        const dimensions = type === 'skin' 
            ? { width: 64, height: 64 }
            : { width: 64, height: 32 };
        
        // Optimiser l'image
        await sharp(imageBuffer)
            .resize(dimensions.width, dimensions.height, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({ quality: 90, compressionLevel: 9 })
            .toFile(filepath);
        
        console.log(`${type} sauvegardé: ${filename}`);
        return filename;
    } catch (error) {
        console.error(`Erreur traitement ${type}:`, error);
        throw error;
    }
}

// Route principale
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Serveur Skins Zendariom</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #0a0a0f;
                    color: #fff;
                }
                .header {
                    text-align: center;
                    padding: 40px;
                    background: linear-gradient(135deg, #6C5CE7, #00CEC9);
                    border-radius: 15px;
                    margin-bottom: 30px;
                }
                .stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .stat-card {
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 10px;
                    text-align: center;
                }
                .stat-card h3 {
                    color: #00CEC9;
                    margin: 0;
                }
                .stat-card p {
                    font-size: 2em;
                    margin: 10px 0 0 0;
                    font-weight: bold;
                }
                .api-info {
                    background: rgba(255,255,255,0.05);
                    padding: 20px;
                    border-radius: 10px;
                    margin-top: 30px;
                }
                code {
                    background: rgba(0,0,0,0.3);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: monospace;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🎮 Serveur Skins Zendariom</h1>
                <p>Système de skins personnalisés pour le serveur</p>
            </div>
            
            <div class="stats">
                <div class="stat-card">
                    <h3>👥 Joueurs</h3>
                    <p>${Object.keys(database.players).length}</p>
                </div>
                <div class="stat-card">
                    <h3>🔄 Dernière mise à jour</h3>
                    <p>${new Date(database.lastUpdate).toLocaleDateString()}</p>
                </div>
                <div class="stat-card">
                    <h3>📁 Skins actifs</h3>
                    <p>${Object.values(database.players).filter(p => p.skin).length}</p>
                </div>
            </div>
            
            <div class="api-info">
                <h2>🔧 API Endpoints</h2>
                <ul>
                    <li><strong>GET</strong> <code>/api/skin/:username</code> - Récupérer le skin d'un joueur</li>
                    <li><strong>GET</strong> <code>/api/cape/:username</code> - Récupérer la cape d'un joueur</li>
                    <li><strong>GET</strong> <code>/api/player/:username</code> - Infos complètes du joueur</li>
                    <li><strong>POST</strong> <code>/api/upload</code> - Uploader un skin/cape</li>
                    <li><strong>GET</strong> <code>/api/players</code> - Liste des joueurs</li>
                </ul>
                
                <h3 style="margin-top: 20px;">🎯 Pour le launcher</h3>
                <p>Le launcher utilise: <code>/api/skin/[pseudo]</code></p>
                <p>Exemple: <code>${req.protocol}://${req.get('host')}/api/skin/Steve</code></p>
            </div>
        </body>
        </html>
    `);
});

// Upload skin/cape
app.post('/api/upload', upload.fields([
    { name: 'skin', maxCount: 1 },
    { name: 'cape', maxCount: 1 }
]), async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username || !/^[a-zA-Z0-9_]{3,16}$/.test(username)) {
            return res.status(400).json({ 
                success: false,
                error: 'Pseudo invalide (3-16 caractères: lettres, chiffres, underscores)' 
            });
        }
        
        console.log(`Upload demandé pour: ${username}`);
        
        let skinFilename = null;
        let capeFilename = null;
        
        // Traiter le skin
        if (req.files && req.files['skin']) {
            try {
                skinFilename = await processAndSaveImage(
                    req.files['skin'][0].buffer,
                    username,
                    'skin'
                );
            } catch (error) {
                return res.status(500).json({
                    success: false,
                    error: 'Erreur traitement du skin'
                });
            }
        }
        
        // Traiter la cape
        if (req.files && req.files['cape']) {
            try {
                capeFilename = await processAndSaveImage(
                    req.files['cape'][0].buffer,
                    username,
                    'cape'
                );
            } catch (error) {
                console.error('Erreur traitement cape:', error);
                // On continue même si la cape échoue
            }
        }
        
        if (!skinFilename) {
            return res.status(400).json({
                success: false,
                error: 'Aucun skin fourni'
            });
        }
        
        // Mettre à jour la base de données
        database.players[username] = {
            username: username,
            skin: skinFilename,
            cape: capeFilename,
            lastUpdate: new Date().toISOString(),
            ip: req.ip
        };
        
        saveDatabase();
        
        res.json({
            success: true,
            message: 'Skin uploadé avec succès!',
            player: {
                username: username,
                skin: `/skins/${skinFilename}`,
                cape: capeFilename ? `/capes/${capeFilename}` : null,
                lastUpdate: database.players[username].lastUpdate
            }
        });
        
    } catch (error) {
        console.error('Erreur upload:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de l\'upload'
        });
    }
});

// Obtenir le skin d'un joueur
app.get('/api/skin/:username', async (req, res) => {
    try {
        const username = req.params.username;
        
        console.log(`Demande skin pour: ${username}`);
        
        if (database.players[username] && database.players[username].skin) {
            const skinFile = database.players[username].skin;
            const skinPath = path.join(SKINS_DIR, skinFile);
            
            if (fs.existsSync(skinPath)) {
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache 24h
                res.sendFile(skinPath);
                return;
            }
        }
        
        // Retourner le skin par défaut
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.sendFile(defaultSkinPath);
        
    } catch (error) {
        console.error('Erreur récupération skin:', error);
        res.setHeader('Content-Type', 'image/png');
        res.sendFile(defaultSkinPath);
    }
});

// Obtenir la cape d'un joueur
app.get('/api/cape/:username', (req, res) => {
    try {
        const username = req.params.username;
        
        if (database.players[username] && database.players[username].cape) {
            const capeFile = database.players[username].cape;
            const capePath = path.join(CAPES_DIR, capeFile);
            
            if (fs.existsSync(capePath)) {
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                res.sendFile(capePath);
                return;
            }
        }
        
        res.status(404).json({
            success: false,
            error: 'Cape non trouvée'
        });
        
    } catch (error) {
        console.error('Erreur récupération cape:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Obtenir les infos d'un joueur
app.get('/api/player/:username', (req, res) => {
    try {
        const username = req.params.username;
        
        if (database.players[username]) {
            const player = database.players[username];
            res.json({
                success: true,
                player: {
                    username: player.username,
                    skin: `/api/skin/${player.username}`,
                    cape: player.cape ? `/api/cape/${player.username}` : null,
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
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Lister tous les joueurs
app.get('/api/players', (req, res) => {
    try {
        const players = Object.values(database.players)
            .sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate))
            .map(player => ({
                username: player.username,
                skin: player.skin ? `/api/skin/${player.username}` : null,
                lastUpdate: player.lastUpdate
            }));
        
        res.json({
            success: true,
            count: players.length,
            players: players,
            lastUpdate: database.lastUpdate
        });
    } catch (error) {
        console.error('Erreur liste joueurs:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Vérifier si un joueur a un skin
app.get('/api/hasskin/:username', (req, res) => {
    try {
        const username = req.params.username;
        const hasSkin = !!(database.players[username] && database.players[username].skin);
        
        res.json({
            success: true,
            username: username,
            hasSkin: hasSkin,
            skinUrl: hasSkin ? `/api/skin/${username}` : null
        });
    } catch (error) {
        console.error('Erreur vérification skin:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Purger les anciens skins (maintenance)
app.get('/api/cleanup', (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        
        let deleted = 0;
        
        Object.keys(database.players).forEach(username => {
            const player = database.players[username];
            const lastUpdate = new Date(player.lastUpdate);
            
            if (lastUpdate < cutoffDate) {
                // Supprimer les fichiers
                if (player.skin) {
                    const skinPath = path.join(SKINS_DIR, player.skin);
                    if (fs.existsSync(skinPath)) {
                        fs.unlinkSync(skinPath);
                    }
                }
                
                if (player.cape) {
                    const capePath = path.join(CAPES_DIR, player.cape);
                    if (fs.existsSync(capePath)) {
                        fs.unlinkSync(capePath);
                    }
                }
                
                delete database.players[username];
                deleted++;
            }
        });
        
        saveDatabase();
        
        res.json({
            success: true,
            message: `Nettoyage terminé: ${deleted} joueurs supprimés`,
            remaining: Object.keys(database.players).length
        });
    } catch (error) {
        console.error('Erreur cleanup:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Backup de la base de données
app.get('/api/backup', (req, res) => {
    try {
        const backupName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const backupPath = path.join('backups', backupName);
        
        if (!fs.existsSync('backups')) {
            fs.mkdirSync('backups', { recursive: true });
        }
        
        fs.writeFileSync(backupPath, JSON.stringify(database, null, 2), 'utf8');
        
        res.json({
            success: true,
            message: 'Backup créé avec succès',
            filename: backupName,
            size: fs.statSync(backupPath).size
        });
    } catch (error) {
        console.error('Erreur backup:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Statistiques
app.get('/api/stats', (req, res) => {
    try {
        const players = Object.values(database.players);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const stats = {
            totalPlayers: players.length,
            playersWithSkin: players.filter(p => p.skin).length,
            playersWithCape: players.filter(p => p.cape).length,
            newToday: players.filter(p => new Date(p.lastUpdate) >= today).length,
            lastWeek: players.filter(p => {
                const date = new Date(p.lastUpdate);
                return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            }).length,
            storage: {
                skins: fs.readdirSync(SKINS_DIR).length,
                capes: fs.readdirSync(CAPES_DIR).length
            }
        };
        
        res.json({
            success: true,
            stats: stats,
            lastUpdate: database.lastUpdate
        });
    } catch (error) {
        console.error('Erreur stats:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur'
        });
    }
});

// Gestion 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint non trouvé',
        available: [
            'GET  /',
            'GET  /api/skin/:username',
            'GET  /api/cape/:username',
            'GET  /api/player/:username',
            'GET  /api/players',
            'GET  /api/hasskin/:username',
            'POST /api/upload',
            'GET  /api/stats'
        ]
    });
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur Skins Zendariom démarré sur le port ${PORT}`);
    console.log(`📁 Skins: ${SKINS_DIR}`);
    console.log(`📁 Capes: ${CAPES_DIR}`);
    console.log(`📊 Joueurs enregistrés: ${Object.keys(database.players).length}`);
    console.log(`🔗 URL API: http://localhost:${PORT}/api/skin/[pseudo]`);
});
