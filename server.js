// server.js - Serveur de skins avec JSON
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const SKINS_DIR = path.join(__dirname, 'skins');
const JSON_FILE = path.join(DATA_DIR, 'skins.json');

// Initialiser le serveur
async function initializeServer() {
    try {
        // Créer les dossiers si inexistants
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(SKINS_DIR, { recursive: true });
        
        // Créer le fichier JSON si inexistant
        try {
            await fs.access(JSON_FILE);
        } catch {
            await fs.writeFile(JSON_FILE, JSON.stringify([], null, 2));
            console.log('Fichier skins.json créé');
        }
        
        console.log('Serveur initialisé avec succès');
    } catch (error) {
        console.error('Erreur initialisation:', error);
        process.exit(1);
    }
}

// Générer un ID unique pour le skin
function generateSkinId(skinData) {
    return crypto.createHash('md5').update(skinData).digest('hex');
}

// Lire le fichier JSON
async function readSkinDatabase() {
    try {
        const data = await fs.readFile(JSON_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lecture JSON:', error);
        return [];
    }
}

// Écrire dans le fichier JSON
async function writeSkinDatabase(data) {
    try {
        await fs.writeFile(JSON_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Erreur écriture JSON:', error);
        return false;
    }
}

// Sauvegarder l'image du skin
async function saveSkinImage(skinId, skinData) {
    try {
        const imagePath = path.join(SKINS_DIR, `${skinId}.png`);
        const buffer = Buffer.from(skinData, 'base64');
        await fs.writeFile(imagePath, buffer);
        return true;
    } catch (error) {
        console.error('Erreur sauvegarde image:', error);
        return false;
    }
}

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Route principale
app.get('/', (req, res) => {
    res.json({
        message: 'Serveur de skins Minecraft',
        version: '1.0.0',
        endpoints: {
            upload: 'POST /upload',
            get: 'GET /get/:username',
            list: 'GET /list',
            all: 'GET /all'
        }
    });
});

// Upload d'un skin
app.post('/upload', async (req, res) => {
    try {
        const { username, skin_data } = req.body;
        
        console.log(`Upload demandé par: ${username}`);
        
        if (!username || !skin_data) {
            return res.status(400).json({
                success: false,
                error: 'Données manquantes. username et skin_data requis.'
            });
        }
        
        if (!username.match(/^[a-zA-Z0-9_]{3,16}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Nom d\'utilisateur invalide (3-16 caractères alphanumériques)'
            });
        }
        
        // Générer l'ID du skin
        const skinId = generateSkinId(skin_data);
        console.log(`Skin ID généré: ${skinId}`);
        
        // Lire la base de données
        const database = await readSkinDatabase();
        
        // Vérifier si l'utilisateur existe déjà
        const userIndex = database.findIndex(user => user.username === username);
        
        if (userIndex !== -1) {
            // Mettre à jour l'ID du skin existant
            const oldSkinId = database[userIndex].skin_id;
            console.log(`Mise à jour skin pour ${username}: ${oldSkinId} → ${skinId}`);
            database[userIndex].skin_id = skinId;
            database[userIndex].updated_at = new Date().toISOString();
        } else {
            // Ajouter un nouvel utilisateur
            console.log(`Nouvel utilisateur: ${username} avec skin ID: ${skinId}`);
            database.push({
                username: username,
                skin_id: skinId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        
        // Sauvegarder l'image
        const imageSaved = await saveSkinImage(skinId, skin_data);
        if (!imageSaved) {
            return res.status(500).json({
                success: false,
                error: 'Erreur sauvegarde image'
            });
        }
        
        // Mettre à jour la base de données JSON
        const dbUpdated = await writeSkinDatabase(database);
        if (!dbUpdated) {
            return res.status(500).json({
                success: false,
                error: 'Erreur mise à jour base de données'
            });
        }
        
        res.json({
            success: true,
            message: userIndex !== -1 ? 'Skin mis à jour' : 'Skin ajouté',
            username: username,
            skin_id: skinId,
            timestamp: new Date().toISOString(),
            total_users: database.length
        });
        
    } catch (error) {
        console.error('Erreur upload:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne'
        });
    }
});

// Récupérer le skin d'un utilisateur
app.get('/get/:username', async (req, res) => {
    try {
        const username = req.params.username;
        console.log(`Demande skin pour: ${username}`);
        
        const database = await readSkinDatabase();
        const user = database.find(u => u.username === username);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }
        
        // Lire l'image du skin
        const skinPath = path.join(SKINS_DIR, `${user.skin_id}.png`);
        
        try {
            await fs.access(skinPath);
            const imageData = await fs.readFile(skinPath);
            const base64Data = imageData.toString('base64');
            
            res.json({
                success: true,
                username: user.username,
                skin_id: user.skin_id,
                skin_data: base64Data,
                created_at: user.created_at,
                updated_at: user.updated_at
            });
            
        } catch (error) {
            console.error(`Skin image non trouvée pour ${user.skin_id}`);
            res.status(404).json({
                success: false,
                error: 'Image du skin non trouvée'
            });
        }
        
    } catch (error) {
        console.error('Erreur récupération:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne'
        });
    }
});

// Récupérer l'image directe du skin (pour affichage web)
app.get('/skin/:skinId', async (req, res) => {
    try {
        const skinId = req.params.skinId;
        const skinPath = path.join(SKINS_DIR, `${skinId}.png`);
        
        try {
            await fs.access(skinPath);
            res.setHeader('Content-Type', 'image/png');
            const imageData = await fs.readFile(skinPath);
            res.send(imageData);
        } catch {
            res.status(404).json({ error: 'Skin non trouvé' });
        }
    } catch (error) {
        console.error('Erreur image:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Lister tous les utilisateurs
app.get('/list', async (req, res) => {
    try {
        const database = await readSkinDatabase();
        
        res.json({
            success: true,
            count: database.length,
            users: database.map(user => ({
                username: user.username,
                skin_id: user.skin_id,
                updated_at: user.updated_at
            }))
        });
    } catch (error) {
        console.error('Erreur liste:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne'
        });
    }
});

// Récupérer toutes les données (format spécifié)
app.get('/all', async (req, res) => {
    try {
        const database = await readSkinDatabase();
        
        res.json(database.map(user => ({
            username: user.username,
            skin_id: user.skin_id
        })));
    } catch (error) {
        console.error('Erreur all:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Vérifier si un utilisateur existe
app.get('/check/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const database = await readSkinDatabase();
        const user = database.find(u => u.username === username);
        
        res.json({
            exists: !!user,
            username: username,
            has_skin: !!user,
            skin_id: user ? user.skin_id : null
        });
    } catch (error) {
        console.error('Erreur check:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer un utilisateur (admin)
app.delete('/delete/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const adminKey = req.query.key;
        
        // Vérification admin simple
        if (adminKey !== 'ADMIN_SECRET_KEY') {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        
        const database = await readSkinDatabase();
        const userIndex = database.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const user = database[userIndex];
        
        // Supprimer l'image du skin
        const skinPath = path.join(SKINS_DIR, `${user.skin_id}.png`);
        try {
            await fs.unlink(skinPath);
        } catch (error) {
            console.warn(`Impossible de supprimer l'image: ${error.message}`);
        }
        
        // Supprimer de la base de données
        database.splice(userIndex, 1);
        await writeSkinDatabase(database);
        
        res.json({
            success: true,
            message: `Utilisateur ${username} supprimé`,
            deleted_user: user
        });
    } catch (error) {
        console.error('Erreur suppression:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Statistiques du serveur
app.get('/stats', async (req, res) => {
    try {
        const database = await readSkinDatabase();
        const skinsCount = await fs.readdir(SKINS_DIR)
            .then(files => files.filter(f => f.endsWith('.png')).length)
            .catch(() => 0);
        
        res.json({
            users_count: database.length,
            skins_count: skinsCount,
            server_uptime: process.uptime(),
            last_update: database.length > 0 
                ? database.reduce((latest, user) => 
                    new Date(user.updated_at) > new Date(latest) ? user.updated_at : latest, 
                    database[0].updated_at)
                : null
        });
    } catch (error) {
        console.error('Erreur stats:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route de santé
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'minecraft-skin-server'
    });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.url
    });
});

// Gestion des erreurs globales
app.use((error, req, res, next) => {
    console.error('Erreur globale:', error);
    res.status(500).json({
        error: 'Erreur serveur interne',
        message: error.message
    });
});

// Démarrer le serveur
async function startServer() {
    await initializeServer();
    
    app.listen(port, '0.0.0.0', () => {
        console.log(`=======================================`);
        console.log(`Serveur de skins Minecraft démarré`);
        console.log(`Port: ${port}`);
        console.log(`URL: http://localhost:${port}`);
        console.log(`Données: ${DATA_DIR}`);
        console.log(`Skins: ${SKINS_DIR}`);
        console.log(`JSON: ${JSON_FILE}`);
        console.log(`=======================================`);
        
        // Afficher les routes disponibles
        console.log('\nRoutes disponibles:');
        console.log('GET  /              - Informations du serveur');
        console.log('POST /upload        - Uploader un skin');
        console.log('GET  /get/:username - Récupérer un skin');
        console.log('GET  /list          - Liste des utilisateurs');
        console.log('GET  /all           - Toutes les données (format simple)');
        console.log('GET  /check/:username - Vérifier un utilisateur');
        console.log('GET  /skin/:skinId  - Image du skin');
        console.log('GET  /stats         - Statistiques');
        console.log('GET  /health        - Santé du serveur');
        console.log('DELETE /delete/:username?key=ADMIN_SECRET_KEY - Supprimer (admin)');
    });
}

startServer().catch(error => {
    console.error('Échec démarrage serveur:', error);
    process.exit(1);
});
