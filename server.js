// server.js - Version finale avec création automatique
const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();
const port = 3000;

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const SKINS_DIR = path.join(DATA_DIR, 'skins');
const CAPES_DIR = path.join(DATA_DIR, 'capes');
const SKIN_JSON = path.join(DATA_DIR, 'skin.json');
const CAPE_JSON = path.join(DATA_DIR, 'cape.json');

// Fonction pour créer un fichier JSON s'il n'existe pas
async function ensureJsonFile(filePath, defaultContent = []) {
    try {
        // Vérifier si le dossier parent existe
        const dir = path.dirname(filePath);
        if (!fsSync.existsSync(dir)) {
            await fs.mkdir(dir, { recursive: true });
            console.log(`📁 Dossier créé: ${dir}`);
        }
        
        // Vérifier si le fichier existe
        if (!fsSync.existsSync(filePath)) {
            await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
            console.log(`📄 Fichier créé: ${filePath}`);
            return defaultContent;
        }
        
        // Lire le fichier existant
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
        
    } catch (error) {
        console.error(`❌ Erreur avec ${filePath}:`, error);
        
        // En cas d'erreur, créer un nouveau fichier
        try {
            await fs.writeFile(filePath, JSON.stringify(defaultContent, null, 2));
            console.log(`✅ Fichier recréé après erreur: ${filePath}`);
            return defaultContent;
        } catch (retryError) {
            console.error(`❌ Impossible de créer ${filePath}:`, retryError);
            return defaultContent;
        }
    }
}

// Initialiser le serveur
async function initializeServer() {
    try {
        console.log('🚀 Initialisation du serveur...');
        
        // Créer les dossiers s'ils n'existent pas
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.mkdir(SKINS_DIR, { recursive: true });
        await fs.mkdir(CAPES_DIR, { recursive: true });
        
        // Créer les fichiers JSON s'ils n'existent pas
        await ensureJsonFile(SKIN_JSON);
        await ensureJsonFile(CAPE_JSON);
        
        console.log('✅ Serveur initialisé avec succès');
        console.log(`📂 Dossier données: ${DATA_DIR}`);
        console.log(`📄 skin.json: ${SKIN_JSON}`);
        console.log(`📄 cape.json: ${CAPE_JSON}`);
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        process.exit(1);
    }
}

// Générer un ID unique MD5
function generateId(data) {
    return crypto.createHash('md5').update(data).digest('hex');
}

// Lire skin.json avec création si nécessaire
async function readSkinDatabase() {
    return await ensureJsonFile(SKIN_JSON);
}

// Lire cape.json avec création si nécessaire
async function readCapeDatabase() {
    return await ensureJsonFile(CAPE_JSON);
}

// Écrire dans skin.json
async function writeSkinDatabase(data) {
    try {
        await fs.writeFile(SKIN_JSON, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Erreur écriture skin.json:', error);
        return false;
    }
}

// Écrire dans cape.json
async function writeCapeDatabase(data) {
    try {
        await fs.writeFile(CAPE_JSON, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Erreur écriture cape.json:', error);
        return false;
    }
}

// Sauvegarder une image
async function saveImage(type, imageId, imageData) {
    try {
        const dir = type === 'cape' ? CAPES_DIR : SKINS_DIR;
        
        // Créer le dossier s'il n'existe pas
        if (!fsSync.existsSync(dir)) {
            await fs.mkdir(dir, { recursive: true });
            console.log(`📁 Dossier ${type}s créé: ${dir}`);
        }
        
        const imagePath = path.join(dir, `${imageId}.png`);
        
        // Nettoyer les données base64
        let cleanData = imageData;
        if (imageData.includes('data:image/png;base64,')) {
            cleanData = imageData.replace('data:image/png;base64,', '');
        }
        
        const buffer = Buffer.from(cleanData, 'base64');
        await fs.writeFile(imagePath, buffer);
        
        console.log(`✅ ${type} sauvegardé: ${imageId}.png (${buffer.length} octets)`);
        return true;
        
    } catch (error) {
        console.error(`❌ Erreur sauvegarde ${type}:`, error);
        return false;
    }
}

// Middleware CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
});

// Middleware de logging
app.use((req, res, next) => {
    console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ============================
// ROUTES PRINCIPALES
// ============================

// 1. Route d'accueil
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Serveur de skins et capes Minecraft',
        version: '3.0.0',
        features: [
            'Création automatique des fichiers JSON',
            'Historique complet des modifications',
            'Skins et capes en base64',
            'Support PNG 64x64 (skins) et 64x32 (capes)'
        ],
        endpoints: {
            upload_skin: 'POST /upload',
            upload_cape: 'POST /upload/cape',
            get_skin: 'GET /skin/:username',
            get_cape: 'GET /cape/:username',
            all_data: 'GET /user/:username',
            list_users: 'GET /list',
            skin_json: 'GET /skin.json',
            cape_json: 'GET /cape.json',
            stats: 'GET /stats'
        }
    });
});

// 2. Upload d'un skin (CRÉE skin.json si nécessaire)
app.post('/upload', async (req, res) => {
    try {
        const { username, skin_data } = req.body;
        
        console.log(`⬆️  Upload skin demandé par: ${username}`);
        
        // Validation des données
        if (!username || !skin_data) {
            return res.status(400).json({
                success: false,
                error: 'Données manquantes. username et skin_data requis.'
            });
        }
        
        // Validation du nom d'utilisateur
        if (!username.match(/^[a-zA-Z0-9_]{3,16}$/)) {
            return res.status(400).json({
                success: false,
                error: 'Nom d\'utilisateur invalide (3-16 caractères alphanumériques)'
            });
        }
        
        // Validation base64
        const base64Regex = /^[A-Za-z0-9+/]+=*$/;
        const cleanData = skin_data.replace(/^data:image\/png;base64,/, '');
        
        if (!base64Regex.test(cleanData)) {
            return res.status(400).json({
                success: false,
                error: 'Format base64 invalide'
            });
        }
        
        // Générer l'ID du skin
        const skinId = generateId(cleanData);
        console.log(`🆔 Skin ID généré: ${skinId}`);
        
        // S'ASSURER que skin.json existe
        const skinDatabase = await readSkinDatabase();
        
        // Sauvegarder l'image
        const imageSaved = await saveImage('skin', skinId, cleanData);
        if (!imageSaved) {
            return res.status(500).json({
                success: false,
                error: 'Erreur sauvegarde image du skin'
            });
        }
        
        // Ajouter une nouvelle entrée
        const newEntry = {
            username: username,
            id_skin: skinId,
            timestamp: new Date().toISOString()
        };
        
        skinDatabase.push(newEntry);
        
        // Sauvegarder dans skin.json (le crée s'il n'existe pas)
        const dbUpdated = await writeSkinDatabase(skinDatabase);
        if (!dbUpdated) {
            return res.status(500).json({
                success: false,
                error: 'Erreur mise à jour skin.json'
            });
        }
        
        // Trouver toutes les entrées de cet utilisateur
        const userEntries = skinDatabase.filter(entry => entry.username === username);
        const latestEntry = userEntries[userEntries.length - 1];
        
        console.log(`✅ Skin uploadé pour ${username} - Total: ${userEntries.length} skins`);
        
        res.json({
            success: true,
            message: userEntries.length === 1 ? 'Premier skin uploadé' : 'Skin mis à jour',
            username: username,
            id_skin: skinId,
            timestamp: new Date().toISOString(),
            total_skins: userEntries.length,
            is_first: userEntries.length === 1
        });
        
    } catch (error) {
        console.error('❌ Erreur upload skin:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne',
            details: error.message
        });
    }
});

// 3. Upload d'une cape (CRÉE cape.json si nécessaire)
app.post('/upload/cape', async (req, res) => {
    try {
        const { username, cape_data } = req.body;
        
        console.log(`⬆️  Upload cape demandé par: ${username}`);
        
        if (!username || !cape_data) {
            return res.status(400).json({
                success: false,
                error: 'Données manquantes. username et cape_data requis.'
            });
        }
        
        // Validation base64
        const base64Regex = /^[A-Za-z0-9+/]+=*$/;
        const cleanData = cape_data.replace(/^data:image\/png;base64,/, '');
        
        if (!base64Regex.test(cleanData)) {
            return res.status(400).json({
                success: false,
                error: 'Format base64 invalide'
            });
        }
        
        // Générer l'ID de la cape
        const capeId = generateId(cleanData);
        console.log(`🆔 Cape ID généré: ${capeId}`);
        
        // S'ASSURER que cape.json existe
        const capeDatabase = await readCapeDatabase();
        
        // Sauvegarder l'image
        const imageSaved = await saveImage('cape', capeId, cleanData);
        if (!imageSaved) {
            return res.status(500).json({
                success: false,
                error: 'Erreur sauvegarde image de la cape'
            });
        }
        
        // Ajouter une nouvelle entrée
        const newEntry = {
            username: username,
            id_cape: capeId,
            timestamp: new Date().toISOString()
        };
        
        capeDatabase.push(newEntry);
        
        // Sauvegarder dans cape.json (le crée s'il n'existe pas)
        const dbUpdated = await writeCapeDatabase(capeDatabase);
        if (!dbUpdated) {
            return res.status(500).json({
                success: false,
                error: 'Erreur mise à jour cape.json'
            });
        }
        
        // Trouver toutes les entrées de cet utilisateur
        const userEntries = capeDatabase.filter(entry => entry.username === username);
        const latestEntry = userEntries[userEntries.length - 1];
        
        console.log(`✅ Cape uploadée pour ${username} - Total: ${userEntries.length} capes`);
        
        res.json({
            success: true,
            message: userEntries.length === 1 ? 'Première cape uploadée' : 'Cape mise à jour',
            username: username,
            id_cape: capeId,
            timestamp: new Date().toISOString(),
            total_capes: userEntries.length,
            is_first: userEntries.length === 1
        });
        
    } catch (error) {
        console.error('❌ Erreur upload cape:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne',
            details: error.message
        });
    }
});

// 4. Récupérer le DERNIER skin d'un utilisateur
app.get('/skin/:username', async (req, res) => {
    try {
        const username = req.params.username;
        console.log(`🔍 Demande skin pour: ${username}`);
        
        // S'ASSURER que skin.json existe
        const skinDatabase = await readSkinDatabase();
        
        // Filtrer les skins de cet utilisateur
        const userSkins = skinDatabase.filter(entry => entry.username === username);
        
        if (userSkins.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Aucun skin trouvé pour cet utilisateur'
            });
        }
        
        // Prendre le DERNIER skin (le plus récent)
        const latestSkin = userSkins[userSkins.length - 1];
        
        // Lire le fichier image
        const skinPath = path.join(SKINS_DIR, `${latestSkin.id_skin}.png`);
        
        try {
            // Vérifier si le fichier existe
            await fs.access(skinPath);
            
            // Lire et convertir en base64
            const imageData = await fs.readFile(skinPath);
            const base64Data = imageData.toString('base64');
            
            console.log(`✅ Skin trouvé pour ${username}: ${latestSkin.id_skin}`);
            
            res.json({
                success: true,
                username: username,
                id_skin: latestSkin.id_skin,
                skin_data: base64Data,
                timestamp: latestSkin.timestamp,
                skin_history_count: userSkins.length,
                is_latest: true,
                file_size: imageData.length
            });
            
        } catch (fileError) {
            console.error(`❌ Skin image non trouvée: ${latestSkin.id_skin}`);
            res.status(404).json({
                success: false,
                error: 'Image du skin non trouvée sur le serveur'
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur récupération skin:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne'
        });
    }
});

// 5. Récupérer la DERNIÈRE cape d'un utilisateur
app.get('/cape/:username', async (req, res) => {
    try {
        const username = req.params.username;
        console.log(`🔍 Demande cape pour: ${username}`);
        
        // S'ASSURER que cape.json existe
        const capeDatabase = await readCapeDatabase();
        
        // Filtrer les capes de cet utilisateur
        const userCapes = capeDatabase.filter(entry => entry.username === username);
        
        if (userCapes.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Aucune cape trouvée pour cet utilisateur'
            });
        }
        
        // Prendre la DERNIÈRE cape (la plus récente)
        const latestCape = userCapes[userCapes.length - 1];
        
        // Lire le fichier image
        const capePath = path.join(CAPES_DIR, `${latestCape.id_cape}.png`);
        
        try {
            // Vérifier si le fichier existe
            await fs.access(capePath);
            
            // Lire et convertir en base64
            const imageData = await fs.readFile(capePath);
            const base64Data = imageData.toString('base64');
            
            console.log(`✅ Cape trouvée pour ${username}: ${latestCape.id_cape}`);
            
            res.json({
                success: true,
                username: username,
                id_cape: latestCape.id_cape,
                cape_data: base64Data,
                timestamp: latestCape.timestamp,
                cape_history_count: userCapes.length,
                is_latest: true,
                file_size: imageData.length
            });
            
        } catch (fileError) {
            console.error(`❌ Cape image non trouvée: ${latestCape.id_cape}`);
            res.status(404).json({
                success: false,
                error: 'Image de la cape non trouvée sur le serveur'
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur récupération cape:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne'
        });
    }
});

// 6. Récupérer toutes les données d'un utilisateur
app.get('/user/:username', async (req, res) => {
    try {
        const username = req.params.username;
        console.log(`👤 Demande données complètes pour: ${username}`);
        
        // S'ASSURER que les fichiers existent
        const skinDatabase = await readSkinDatabase();
        const capeDatabase = await readCapeDatabase();
        
        // Récupérer les skins
        const userSkins = skinDatabase.filter(entry => entry.username === username);
        const latestSkin = userSkins.length > 0 ? userSkins[userSkins.length - 1] : null;
        
        // Récupérer les capes
        const userCapes = capeDatabase.filter(entry => entry.username === username);
        const latestCape = userCapes.length > 0 ? userCapes[userCapes.length - 1] : null;
        
        // Récupérer les images si demandées
        let skinData = null;
        let capeData = null;
        
        if (latestSkin && req.query.include_data === 'true') {
            try {
                const skinPath = path.join(SKINS_DIR, `${latestSkin.id_skin}.png`);
                const imageData = await fs.readFile(skinPath);
                skinData = imageData.toString('base64');
            } catch (error) {
                console.error(`⚠️ Skin image non trouvée: ${latestSkin.id_skin}`);
            }
        }
        
        if (latestCape && req.query.include_data === 'true') {
            try {
                const capePath = path.join(CAPES_DIR, `${latestCape.id_cape}.png`);
                const imageData = await fs.readFile(capePath);
                capeData = imageData.toString('base64');
            } catch (error) {
                console.error(`⚠️ Cape image non trouvée: ${latestCape.id_cape}`);
            }
        }
        
        res.json({
            success: true,
            username: username,
            skin: latestSkin ? {
                has_skin: true,
                id_skin: latestSkin.id_skin,
                skin_data: skinData,
                timestamp: latestSkin.timestamp,
                history_count: userSkins.length
            } : { has_skin: false },
            cape: latestCape ? {
                has_cape: true,
                id_cape: latestCape.id_cape,
                cape_data: capeData,
                timestamp: latestCape.timestamp,
                history_count: userCapes.length
            } : { has_cape: false },
            stats: {
                total_skins: userSkins.length,
                total_capes: userCapes.length,
                has_both: latestSkin && latestCape
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur données utilisateur:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne'
        });
    }
});

// 7. Récupérer skin.json complet
app.get('/skin.json', async (req, res) => {
    try {
        // S'ASSURER que le fichier existe
        const skinDatabase = await readSkinDatabase();
        
        res.json({
            success: true,
            count: skinDatabase.length,
            timestamp: new Date().toISOString(),
            data: skinDatabase
        });
        
    } catch (error) {
        console.error('❌ Erreur skin.json:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne'
        });
    }
});

// 8. Récupérer cape.json complet
app.get('/cape.json', async (req, res) => {
    try {
        // S'ASSURER que le fichier existe
        const capeDatabase = await readCapeDatabase();
        
        res.json({
            success: true,
            count: capeDatabase.length,
            timestamp: new Date().toISOString(),
            data: capeDatabase
        });
        
    } catch (error) {
        console.error('❌ Erreur cape.json:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne'
        });
    }
});

// 9. Lister tous les utilisateurs
app.get('/list', async (req, res) => {
    try {
        // S'ASSURER que les fichiers existent
        const skinDatabase = await readSkinDatabase();
        const capeDatabase = await readCapeDatabase();
        
        // Récupérer tous les utilisateurs uniques
        const allUsers = [...new Set([
            ...skinDatabase.map(s => s.username),
            ...capeDatabase.map(c => c.username)
        ])];
        
        const usersList = allUsers.map(username => {
            const userSkins = skinDatabase.filter(s => s.username === username);
            const userCapes = capeDatabase.filter(c => c.username === username);
            
            return {
                username: username,
                has_skin: userSkins.length > 0,
                has_cape: userCapes.length > 0,
                skin_count: userSkins.length,
                cape_count: userCapes.length,
                last_skin: userSkins.length > 0 ? userSkins[userSkins.length - 1].timestamp : null,
                last_cape: userCapes.length > 0 ? userCapes[userCapes.length - 1].timestamp : null
            };
        });
        
        res.json({
            success: true,
            count: usersList.length,
            users: usersList
        });
        
    } catch (error) {
        console.error('❌ Erreur liste:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne'
        });
    }
});

// 10. Statistiques
app.get('/stats', async (req, res) => {
    try {
        // S'ASSURER que les fichiers existent
        const skinDatabase = await readSkinDatabase();
        const capeDatabase = await readCapeDatabase();
        
        // Compter les fichiers images
        let skinsCount = 0;
        let capesCount = 0;
        
        try {
            const skinFiles = await fs.readdir(SKINS_DIR);
            skinsCount = skinFiles.filter(f => f.endsWith('.png')).length;
        } catch (error) {
            console.log('⚠️ Aucun skin dans le dossier');
        }
        
        try {
            const capeFiles = await fs.readdir(CAPES_DIR);
            capesCount = capeFiles.filter(f => f.endsWith('.png')).length;
        } catch (error) {
            console.log('⚠️ Aucune cape dans le dossier');
        }
        
        // Statistiques
        const totalUsers = [...new Set([
            ...skinDatabase.map(s => s.username),
            ...capeDatabase.map(c => c.username)
        ])].length;
        
        const usersWithBoth = [...new Set(skinDatabase.map(s => s.username))]
            .filter(username => capeDatabase.some(c => c.username === username))
            .length;
        
        res.json({
            success: true,
            server: {
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                version: '3.0.0'
            },
            database: {
                skin_entries: skinDatabase.length,
                cape_entries: capeDatabase.length,
                unique_users: totalUsers
            },
            files: {
                skin_images: skinsCount,
                cape_images: capesCount,
                total_images: skinsCount + capesCount
            },
            users: {
                with_skin: [...new Set(skinDatabase.map(s => s.username))].length,
                with_cape: [...new Set(capeDatabase.map(c => c.username))].length,
                with_both: usersWithBoth,
                skin_only: [...new Set(skinDatabase.map(s => s.username))]
                    .filter(username => !capeDatabase.some(c => c.username === username))
                    .length,
                cape_only: [...new Set(capeDatabase.map(c => c.username))]
                    .filter(username => !skinDatabase.some(s => s.username === username))
                    .length
            }
        });
        
    } catch (error) {
        console.error('❌ Erreur stats:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur interne'
        });
    }
});

// 11. Vérifier la santé du serveur
app.get('/health', async (req, res) => {
    try {
        // Tenter de lire les fichiers JSON
        await readSkinDatabase();
        await readCapeDatabase();
        
        // Vérifier les dossiers
        const dataDirExists = fsSync.existsSync(DATA_DIR);
        const skinsDirExists = fsSync.existsSync(SKINS_DIR);
        const capesDirExists = fsSync.existsSync(CAPES_DIR);
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            directories: {
                data: dataDirExists ? 'ok' : 'missing',
                skins: skinsDirExists ? 'ok' : 'missing',
                capes: capesDirExists ? 'ok' : 'missing'
            },
            files: {
                skin_json: fsSync.existsSync(SKIN_JSON) ? 'ok' : 'missing',
                cape_json: fsSync.existsSync(CAPE_JSON) ? 'ok' : 'missing'
            },
            server: {
                uptime: process.uptime(),
                memory: process.memoryUsage()
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// 12. Image directe du skin
app.get('/skin-img/:skinId', async (req, res) => {
    try {
        const skinId = req.params.skinId;
        const skinPath = path.join(SKINS_DIR, `${skinId}.png`);
        
        if (fsSync.existsSync(skinPath)) {
            res.setHeader('Content-Type', 'image/png');
            const imageData = await fs.readFile(skinPath);
            res.send(imageData);
        } else {
            res.status(404).json({ 
                success: false,
                error: 'Skin non trouvé' 
            });
        }
    } catch (error) {
        console.error('❌ Erreur image skin:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur serveur' 
        });
    }
});

// 13. Image directe de la cape
app.get('/cape-img/:capeId', async (req, res) => {
    try {
        const capeId = req.params.capeId;
        const capePath = path.join(CAPES_DIR, `${capeId}.png`);
        
        if (fsSync.existsSync(capePath)) {
            res.setHeader('Content-Type', 'image/png');
            const imageData = await fs.readFile(capePath);
            res.send(imageData);
        } else {
            res.status(404).json({ 
                success: false,
                error: 'Cape non trouvée' 
            });
        }
    } catch (error) {
        console.error('❌ Erreur image cape:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur serveur' 
        });
    }
});

// 14. Réinitialiser les données (admin)
app.delete('/reset', async (req, res) => {
    try {
        const adminKey = req.query.key;
        
        // Vérification admin simple
        if (adminKey !== 'ADMIN_SECRET_KEY') {
            return res.status(403).json({ 
                success: false,
                error: 'Accès refusé' 
            });
        }
        
        // Réinitialiser les fichiers JSON
        await writeSkinDatabase([]);
        await writeCapeDatabase([]);
        
        // Optionnel: vider les dossiers d'images
        if (req.query.clear_images === 'true') {
            try {
                const skinFiles = await fs.readdir(SKINS_DIR);
                for (const file of skinFiles) {
                    if (file.endsWith('.png')) {
                        await fs.unlink(path.join(SKINS_DIR, file));
                    }
                }
                
                const capeFiles = await fs.readdir(CAPES_DIR);
                for (const file of capeFiles) {
                    if (file.endsWith('.png')) {
                        await fs.unlink(path.join(CAPES_DIR, file));
                    }
                }
            } catch (error) {
                console.log('⚠️ Impossible de vider les dossiers:', error.message);
            }
        }
        
        res.json({
            success: true,
            message: 'Données réinitialisées',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Erreur réinitialisation:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erreur serveur' 
        });
    }
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route non trouvée',
        path: req.url,
        suggestion: 'Visitez GET / pour voir toutes les routes disponibles'
    });
});

// Gestion des erreurs globales
app.use((error, req, res, next) => {
    console.error('❌ Erreur globale:', error);
    res.status(500).json({
        success: false,
        error: 'Erreur serveur interne',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// Démarrer le serveur
async function startServer() {
    await initializeServer();
    
    const server = app.listen(port, '0.0.0.0', () => {
        console.log('\n' + '='.repeat(50));
        console.log('🎮 SERVEUR SKINS/CAPES MINECRAFT');
        console.log('='.repeat(50));
        console.log(`✅ Serveur démarré sur le port ${port}`);
        console.log(`🌐 URL: http://localhost:${port}`);
        console.log(`📂 Dossier données: ${DATA_DIR}`);
        console.log('='.repeat(50));
        console.log('\n📋 Routes disponibles:');
        console.log('├── GET  /              - Informations');
        console.log('├── POST /upload        - Uploader un skin');
        console.log('├── POST /upload/cape   - Uploader une cape');
        console.log('├── GET  /skin/:user    - Récupérer dernier skin');
        console.log('├── GET  /cape/:user    - Récupérer dernière cape');
        console.log('├── GET  /user/:user    - Toutes données utilisateur');
        console.log('├── GET  /skin.json     - Tous les skins');
        console.log('├── GET  /cape.json     - Toutes les capes');
        console.log('├── GET  /list          - Liste utilisateurs');
        console.log('├── GET  /stats         - Statistiques');
        console.log('├── GET  /health        - Santé du serveur');
        console.log('└── DELETE /reset?key=ADMIN_SECRET_KEY - Réinitialiser');
        console.log('\n🚀 Prêt à recevoir des données !');
    });
    
    // Gestion propre de l'arrêt
    process.on('SIGINT', () => {
        console.log('\n\n👋 Arrêt du serveur...');
        server.close(() => {
            console.log('✅ Serveur arrêté proprement');
            process.exit(0);
        });
    });
}

startServer().catch(error => {
    console.error('❌ Échec démarrage serveur:', error);
    process.exit(1);
});
