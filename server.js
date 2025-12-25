/**
 * SYSTÈME DE GESTION DE SKINS & CAPES - SERVEUR BACKEND (Node.js)
 * Hébergement recommandé : Render.com (Gratuit)
 * Stockage persistant : GitHub API
 */

const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000;

// IMPORTANT : Remplace par ton nouveau token ou configure-le dans Render (Environment Variables)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'TON_NOUVEAU_TOKEN_ICI'; 
const REPO_OWNER = 'terrarpg';
const REPO_NAME = 'server-skin-zendariom';
const DATA_FILE_PATH = 'player.json';
const BRANCH = 'main';

// Configuration de l'API GitHub
const githubAPI = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
    }
});

// Augmenter la limite pour les images Base64
app.use(bodyParser.json({ limit: '50mb' }));

/**
 * Récupère les données d'un fichier sur GitHub
 */
async function getGitHubFile(path) {
    try {
        const response = await githubAPI.get(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`);
        return {
            sha: response.data.sha,
            content: Buffer.from(response.data.content, 'base64').toString('utf-8'),
            raw_url: response.data.download_url
        };
    } catch (error) {
        if (error.response && error.response.status === 404) return null;
        throw error;
    }
}

/**
 * Envoie ou met à jour un fichier sur GitHub
 */
async function uploadToGitHub(path, content, message, sha = null, isBinary = false) {
    const data = {
        message: message,
        content: isBinary ? content : Buffer.from(content).toString('base64'),
        branch: BRANCH
    };
    if (sha) data.sha = sha;

    return await githubAPI.put(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, data);
}

/**
 * ENDPOINT : Mise à jour Skin ou Cape
 * Reçoit le type, les métadonnées et l'image en Base64 depuis le Mod
 */
app.post('/api/update-skin', async (req, res) => {
    try {
        const { type, metadata, imageDataBase64 } = req.body;

        if (!metadata || !metadata.uuid || !imageDataBase64) {
            return res.status(400).send("Données incomplètes.");
        }

        console.log(`[LOG] Mise à jour ${type} demandée pour ${metadata.username} (${metadata.uuid})`);

        // 1. Sauvegarder l'image PNG sur GitHub
        const imagePath = `textures/${type}s/${metadata.uuid}.png`;
        const existingImg = await getGitHubFile(imagePath);
        
        await uploadToGitHub(
            imagePath,
            imageDataBase64, // L'image est déjà en base64 via le Mod
            `Upload ${type} : ${metadata.username}`,
            existingImg ? existingImg.sha : null,
            true
        );

        // 2. Mettre à jour le fichier central player.json
        const jsonFile = await getGitHubFile(DATA_FILE_PATH);
        let playerDb = {};

        if (jsonFile) {
            try {
                playerDb = JSON.parse(jsonFile.content);
            } catch (e) {
                playerDb = {};
            }
        }

        // Initialiser l'entrée du joueur si inexistante
        if (!playerDb[metadata.uuid]) {
            playerDb[metadata.uuid] = {
                username: metadata.username,
                skin: null,
                cape: null,
                history: []
            };
        }

        // Mettre à jour l'info spécifique (Skin ou Cape)
        playerDb[metadata.uuid][type] = metadata;
        
        // Ajouter à l'historique
        playerDb[metadata.uuid].history.push({
            type: type,
            date: metadata.lastDownload,
            hash: metadata.hash
        });

        // Sauvegarde finale du JSON
        await uploadToGitHub(
            DATA_FILE_PATH,
            JSON.stringify(playerDb, null, 2),
            `Update metadata : ${metadata.username}`,
            jsonFile ? jsonFile.sha : null
        );

        res.status(200).json({ success: true, message: "Enregistré sur GitHub" });

    } catch (error) {
        console.error("[ERROR]", error.message);
        res.status(500).json({ success: false, error: "Erreur interne du serveur" });
    }
});

/**
 * ENDPOINT : Récupérer toutes les données (utilisé par le Mod au démarrage)
 */
app.get('/api/get-all', async (req, res) => {
    try {
        const file = await getGitHubFile(DATA_FILE_PATH);
        if (!file) return res.json({});
        res.json(JSON.parse(file.content));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Lancement du serveur
 */
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`SERVEUR SKIN ZENDARIO DÉMARRÉ SUR PORT ${PORT}`);
    console.log(`REPO CIBLE : ${REPO_OWNER}/${REPO_NAME}`);
    console.log(`=========================================`);
});
