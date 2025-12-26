const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 10000;

// Configuration Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomStr = crypto.randomBytes(8).toString('hex');
        const filename = `${timestamp}_${randomStr}.png`;
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/png') {
            cb(null, true);
        } else {
            cb(new Error('Seuls les fichiers PNG sont autorisés'), false);
        }
    }
});

// Middleware CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route racine - Interface simplifiée
app.get('/', (req, res) => {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Système Skin/Cape Minecraft</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background: #1a1a1a;
            color: white;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .container {
            width: 100%;
            max-width: 1200px;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            color: #4CAF50;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .header .subtitle {
            color: #ccc;
            font-size: 1.1rem;
        }

        .setup-box {
            background: #2d2d2d;
            border-radius: 10px;
            padding: 30px;
            margin-bottom: 30px;
            text-align: center;
            border: 2px solid #3d3d3d;
        }

        .setup-box h2 {
            color: #4CAF50;
            margin-bottom: 20px;
            font-size: 1.8rem;
        }

        .input-group {
            margin-bottom: 20px;
        }

        .input-group label {
            display: block;
            margin-bottom: 8px;
            color: #ccc;
            font-size: 1.1rem;
        }

        .input-group input {
            width: 100%;
            max-width: 400px;
            padding: 12px;
            border: 2px solid #3d3d3d;
            border-radius: 6px;
            background: #1a1a1a;
            color: white;
            font-size: 1.1rem;
            text-align: center;
        }

        .btn {
            padding: 12px 30px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: background 0.3s;
        }

        .btn:hover {
            background: #45a049;
        }

        .interface-grid {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 20px;
            min-height: 500px;
        }

        @media (max-width: 768px) {
            .interface-grid {
                grid-template-columns: 1fr;
            }
        }

        .action-panel {
            background: #2d2d2d;
            border-radius: 10px;
            padding: 20px;
            border: 2px solid #3d3d3d;
        }

        .action-panel h3 {
            color: #4CAF50;
            margin-bottom: 20px;
            text-align: center;
            font-size: 1.5rem;
        }

        .action-btn {
            width: 100%;
            padding: 15px;
            margin-bottom: 10px;
            background: #333;
            color: white;
            border: 2px solid #444;
            border-radius: 8px;
            font-size: 1.1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: all 0.3s;
        }

        .action-btn:hover {
            background: #444;
            border-color: #4CAF50;
        }

        .skin-btn {
            border-color: #2196F3;
        }

        .skin-btn:hover {
            border-color: #1976D2;
        }

        .cape-btn {
            border-color: #9C27B0;
        }

        .cape-btn:hover {
            border-color: #7B1FA2;
        }

        .history-btn {
            border-color: #FF9800;
        }

        .history-btn:hover {
            border-color: #F57C00;
        }

        .viewer-panel {
            background: #2d2d2d;
            border-radius: 10px;
            padding: 20px;
            border: 2px solid #3d3d3d;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .player-info {
            text-align: center;
            margin-bottom: 30px;
        }

        .player-name {
            color: #4CAF50;
            font-size: 1.8rem;
            margin-bottom: 5px;
        }

        .player-uuid {
            color: #888;
            font-family: monospace;
            font-size: 0.9rem;
            background: #1a1a1a;
            padding: 5px 10px;
            border-radius: 4px;
            display: inline-block;
        }

        .skin-display {
            width: 200px;
            height: 300px;
            background: #1a1a1a;
            border: 3px solid #3d3d3d;
            border-radius: 10px;
            position: relative;
            overflow: hidden;
            margin: 20px 0;
        }

        .skin-model {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 100px;
            height: 200px;
        }

        .skin-part {
            position: absolute;
            background: #555;
            border: 1px solid #777;
        }

        .head {
            width: 40px;
            height: 40px;
            top: 10px;
            left: 30px;
            background: #4CAF50;
        }

        .body {
            width: 50px;
            height: 70px;
            top: 55px;
            left: 25px;
            background: #2196F3;
        }

        .arm-left, .arm-right {
            width: 20px;
            height: 60px;
            top: 60px;
        }

        .arm-left {
            left: 0;
            background: #FF9800;
        }

        .arm-right {
            right: 0;
            background: #FF9800;
        }

        .leg-left, .leg-right {
            width: 20px;
            height: 60px;
            top: 130px;
        }

        .leg-left {
            left: 30px;
            background: #9C27B0;
        }

        .leg-right {
            right: 30px;
            background: #9C27B0;
        }

        .cape {
            position: absolute;
            width: 50px;
            height: 70px;
            top: 55px;
            left: 25px;
            background: rgba(156, 39, 176, 0.3);
            border: 1px solid #9C27B0;
        }

        .current-selection {
            margin-top: 20px;
            padding: 15px;
            background: #1a1a1a;
            border-radius: 8px;
            text-align: center;
            width: 100%;
            max-width: 300px;
        }

        .current-selection h4 {
            color: #4CAF50;
            margin-bottom: 10px;
        }

        .selection-item {
            color: #ccc;
            margin: 5px 0;
            font-size: 0.9rem;
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background: #2d2d2d;
            border-radius: 10px;
            padding: 30px;
            width: 90%;
            max-width: 500px;
            border: 2px solid #3d3d3d;
            text-align: center;
        }

        .modal h3 {
            color: #4CAF50;
            margin-bottom: 20px;
            font-size: 1.5rem;
        }

        .file-upload {
            border: 3px dashed #555;
            border-radius: 8px;
            padding: 40px 20px;
            margin: 20px 0;
            cursor: pointer;
            transition: border-color 0.3s;
        }

        .file-upload:hover {
            border-color: #4CAF50;
        }

        .file-upload p {
            color: #ccc;
            margin: 10px 0;
        }

        .file-info {
            background: #1a1a1a;
            padding: 10px;
            border-radius: 6px;
            margin: 15px 0;
            display: none;
        }

        .modal-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .modal-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
        }

        .cancel-btn {
            background: #666;
            color: white;
        }

        .upload-btn {
            background: #4CAF50;
            color: white;
        }

        .upload-btn:disabled {
            background: #555;
            cursor: not-allowed;
        }

        .message {
            padding: 12px;
            border-radius: 6px;
            margin: 15px 0;
            text-align: center;
            display: none;
        }

        .success {
            background: rgba(76, 175, 80, 0.2);
            border: 1px solid #4CAF50;
            color: #4CAF50;
        }

        .error {
            background: rgba(244, 67, 54, 0.2);
            border: 1px solid #f44336;
            color: #f44336;
        }

        .history-panel {
            display: none;
            background: #2d2d2d;
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            border: 2px solid #3d3d3d;
        }

        .history-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }

        .history-header h4 {
            color: #4CAF50;
        }

        .close-history {
            background: #f44336;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 5px 10px;
            cursor: pointer;
        }

        .history-list {
            max-height: 300px;
            overflow-y: auto;
        }

        .history-item {
            background: #1a1a1a;
            padding: 10px;
            margin-bottom: 8px;
            border-radius: 6px;
            border: 1px solid #333;
        }

        .history-type {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            margin-right: 10px;
        }

        .type-skin {
            background: #2196F3;
            color: white;
        }

        .type-cape {
            background: #9C27B0;
            color: white;
        }

        .history-date {
            color: #888;
            font-size: 0.8rem;
            margin-top: 5px;
        }

        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 Minecraft Skin/Cape System</h1>
            <p class="subtitle">Gérez vos skins et capes simplement</p>
        </div>

        <!-- Étape 1: Entrer pseudo -->
        <div class="setup-box" id="setupBox">
            <h2>Étape 1: Entrez votre pseudo</h2>
            <div class="input-group">
                <label for="username">Pseudo Minecraft</label>
                <input type="text" id="username" placeholder="Votre pseudo...">
            </div>
            <button class="btn" onclick="startSystem()">Commencer</button>
        </div>

        <!-- Interface principale (cachée au début) -->
        <div id="mainInterface" class="hidden">
            <div class="interface-grid">
                <!-- Panneau gauche: Actions -->
                <div class="action-panel">
                    <h3>Actions</h3>
                    <button class="action-btn skin-btn" onclick="openUpload('skin')">
                        <span>👤</span> Ajouter un Skin (AS)
                    </button>
                    <button class="action-btn history-btn" onclick="showHistory('skin')">
                        <span>📜</span> Mes Skins (HS)
                    </button>
                    <button class="action-btn cape-btn" onclick="openUpload('cape')">
                        <span>🦇</span> Ajouter une Cape (AC)
                    </button>
                    <button class="action-btn history-btn" onclick="showHistory('cape')">
                        <span>📜</span> Mes Capes (HC)
                    </button>
                </div>

                <!-- Panneau droit: Visualisation -->
                <div class="viewer-panel">
                    <div class="player-info">
                        <div class="player-name" id="displayName">Joueur</div>
                        <div class="player-uuid" id="displayUUID">UUID: ...</div>
                    </div>

                    <div class="skin-display">
                        <div class="skin-model">
                            <div class="skin-part head"></div>
                            <div class="skin-part body"></div>
                            <div class="skin-part arm-left"></div>
                            <div class="skin-part arm-right"></div>
                            <div class="skin-part leg-left"></div>
                            <div class="skin-part leg-right"></div>
                            <div class="cape" id="capeLayer"></div>
                        </div>
                    </div>

                    <div class="current-selection">
                        <h4>💾 Sélection actuelle</h4>
                        <div class="selection-item" id="currentSkinInfo">Skin: Aucun</div>
                        <div class="selection-item" id="currentCapeInfo">Cape: Aucune</div>
                    </div>
                </div>
            </div>

            <!-- Panneau historique -->
            <div class="history-panel" id="historyPanel">
                <div class="history-header">
                    <h4 id="historyTitle">Historique</h4>
                    <button class="close-history" onclick="closeHistory()">✕ Fermer</button>
                </div>
                <div class="history-list" id="historyList">
                    <!-- L'historique s'affichera ici -->
                </div>
            </div>
        </div>

        <!-- Modale d'upload -->
        <div class="modal" id="uploadModal">
            <div class="modal-content">
                <h3 id="modalTitle">Ajouter un Skin</h3>
                
                <div class="file-upload" onclick="document.getElementById('fileInput').click()">
                    <p style="font-size: 3rem;">📁</p>
                    <p>Cliquez ou déposez votre fichier PNG</p>
                    <p style="color: #888; font-size: 0.9rem;">
                        Format: 64x32 pixels (Skin) ou 64x64 pixels (Cape)
                    </p>
                </div>

                <input type="file" id="fileInput" accept=".png" style="display: none;">

                <div class="file-info" id="fileInfo"></div>

                <div class="modal-buttons">
                    <button class="modal-btn cancel-btn" onclick="closeModal()">
                        Annuler
                    </button>
                    <button class="modal-btn upload-btn" id="uploadBtn" onclick="uploadFile()" disabled>
                        Uploader
                    </button>
                </div>

                <div class="message" id="uploadMessage"></div>
            </div>
        </div>
    </div>

    <script>
        // Variables globales
        let currentPlayer = null;
        let currentUploadType = 'skin';
        let selectedFile = null;

        // Démarrer le système
        function startSystem() {
            const usernameInput = document.getElementById('username');
            const username = usernameInput.value.trim();
            
            if (!username) {
                alert('Veuillez entrer un pseudo !');
                return;
            }

            // Générer un UUID unique
            const uuid = generateUUID();
            
            currentPlayer = {
                username: username,
                uuid: uuid,
                currentSkin: null,
                currentCape: null
            };

            // Mettre à jour l'affichage
            document.getElementById('displayName').textContent = username;
            document.getElementById('displayUUID').textContent = 'UUID: ' + uuid.substring(0, 8) + '...';
            
            // Cacher la setup box, afficher l'interface principale
            document.getElementById('setupBox').style.display = 'none';
            document.getElementById('mainInterface').classList.remove('hidden');
            
            // Charger les données existantes
            loadPlayerData();
        }

        // Générer UUID
        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        // Ouvrir modale d'upload
        function openUpload(type) {
            currentUploadType = type;
            const modal = document.getElementById('uploadModal');
            const title = document.getElementById('modalTitle');
            
            title.textContent = type === 'skin' ? 'Ajouter un Skin' : 'Ajouter une Cape';
            document.getElementById('fileInfo').style.display = 'none';
            document.getElementById('uploadBtn').disabled = true;
            document.getElementById('uploadMessage').style.display = 'none';
            
            // Configurer l'input file
            const fileInput = document.getElementById('fileInput');
            fileInput.onchange = handleFileSelect;
            fileInput.value = '';
            
            modal.style.display = 'flex';
            selectedFile = null;
        }

        // Fermer modale
        function closeModal() {
            document.getElementById('uploadModal').style.display = 'none';
        }

        // Gérer sélection fichier
        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) handleFile(file);
        }

        // Gérer fichier
        function handleFile(file) {
            if (!file.type.includes('png')) {
                showMessage('Seuls les fichiers PNG sont acceptés !', 'error');
                return;
            }

            selectedFile = file;
            const fileInfo = document.getElementById('fileInfo');
            
            fileInfo.innerHTML = \`
                <strong>📄 Fichier sélectionné:</strong><br>
                Nom: \${file.name}<br>
                Taille: \${(file.size / 1024).toFixed(2)} KB
            \`;
            fileInfo.style.display = 'block';
            
            document.getElementById('uploadBtn').disabled = false;
        }

        // Uploader fichier
        async function uploadFile() {
            if (!selectedFile || !currentPlayer) return;
            
            const uploadBtn = document.getElementById('uploadBtn');
            const messageDiv = document.getElementById('uploadMessage');
            
            uploadBtn.innerHTML = 'Upload en cours...';
            uploadBtn.disabled = true;
            
            try {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('username', currentPlayer.username);
                
                const response = await fetch(\`/api/upload/\${currentUploadType}\`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage(\`\${currentUploadType === 'skin' ? 'Skin' : 'Cape'} uploadé avec succès !\`, 'success');
                    
                    // Mettre à jour l'affichage
                    if (currentUploadType === 'skin') {
                        currentPlayer.currentSkin = result.data;
                        updateSkinInfo(result.data);
                    } else {
                        currentPlayer.currentCape = result.data;
                        updateCapeInfo(result.data);
                    }
                    
                    // Recharger l'historique
                    setTimeout(() => {
                        closeModal();
                        showHistory(currentUploadType);
                        uploadBtn.innerHTML = 'Uploader';
                    }, 1500);
                } else {
                    showMessage(\`Erreur: \${result.error}\`, 'error');
                    uploadBtn.disabled = false;
                    uploadBtn.innerHTML = 'Uploader';
                }
            } catch (error) {
                showMessage('Erreur réseau: ' + error.message, 'error');
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = 'Uploader';
            }
        }

        // Afficher l'historique
        async function showHistory(type) {
            if (!currentPlayer) return;
            
            const panel = document.getElementById('historyPanel');
            const title = document.getElementById('historyTitle');
            const list = document.getElementById('historyList');
            
            title.textContent = type === 'skin' ? 'Mes Skins (HS)' : 'Mes Capes (HC)';
            list.innerHTML = '<p style="color:#888;text-align:center;">Chargement...</p>';
            
            try {
                const response = await fetch(\`/api/history/\${type}/\${currentPlayer.username}\`);
                const history = await response.json();
                
                if (!history || history.length === 0) {
                    list.innerHTML = '<p style="color:#888;text-align:center;">Aucun historique</p>';
                } else {
                    let html = '';
                    history.forEach((item, index) => {
                        const date = new Date(item.lastDownload).toLocaleDateString('fr-FR');
                        html += \`
                            <div class="history-item">
                                <div>
                                    <span class="history-type \${type === 'skin' ? 'type-skin' : 'type-cape'}">
                                        \${type === 'skin' ? 'SKIN' : 'CAPE'} #\${index + 1}
                                    </span>
                                    <span style="color:#ccc;">\${item.hash?.substring(0, 8) || 'N/A'}...</span>
                                </div>
                                <div class="history-date">\${date} - \${item.size} bytes</div>
                                <button onclick="selectItem('\${item.hash}')" style="margin-top:5px;padding:3px 8px;background:#444;color:white;border:none;border-radius:3px;cursor:pointer;font-size:0.8rem;">
                                    Sélectionner
                                </button>
                            </div>
                        \`;
                    });
                    list.innerHTML = html;
                }
                
                panel.style.display = 'block';
            } catch (error) {
                list.innerHTML = '<p style="color:#f44336;text-align:center;">Erreur de chargement</p>';
            }
        }

        // Fermer l'historique
        function closeHistory() {
            document.getElementById('historyPanel').style.display = 'none';
        }

        // Sélectionner un item depuis l'historique
        function selectItem(hash) {
            showMessage('Item sélectionné depuis l\'historique', 'success');
            closeHistory();
        }

        // Charger les données du joueur
        async function loadPlayerData() {
            if (!currentPlayer) return;
            
            try {
                // Charger le skin actuel
                const skinResponse = await fetch(\`/api/current/skin/\${currentPlayer.username}\`);
                if (skinResponse.ok) {
                    const skinData = await skinResponse.json();
                    currentPlayer.currentSkin = skinData;
                    updateSkinInfo(skinData);
                }
                
                // Charger la cape actuelle
                const capeResponse = await fetch(\`/api/current/cape/\${currentPlayer.username}\`);
                if (capeResponse.ok) {
                    const capeData = await capeResponse.json();
                    currentPlayer.currentCape = capeData;
                    updateCapeInfo(capeData);
                }
            } catch (error) {
                console.log('Aucune donnée existante');
            }
        }

        // Mettre à jour les infos du skin
        function updateSkinInfo(skinData) {
            if (!skinData) return;
            
            document.getElementById('currentSkinInfo').textContent = \`Skin: \${skinData.hash?.substring(0, 8) || 'Nouveau'}...\`;
            
            // Mettre à jour la couleur du skin
            const skinParts = document.querySelectorAll('.skin-part');
            skinParts.forEach(part => {
                if (!part.classList.contains('cape')) {
                    part.style.background = skinData.type === 'skin' ? '#2196F3' : '#4CAF50';
                }
            });
        }

        // Mettre à jour les infos de la cape
        function updateCapeInfo(capeData) {
            if (!capeData) return;
            
            document.getElementById('currentCapeInfo').textContent = \`Cape: \${capeData.hash?.substring(0, 8) || 'Nouvelle'}...\`;
            
            // Afficher la cape
            const capeLayer = document.getElementById('capeLayer');
            capeLayer.style.display = 'block';
            capeLayer.style.background = 'rgba(156, 39, 176, 0.5)';
        }

        // Afficher un message
        function showMessage(text, type) {
            const messageDiv = document.getElementById('uploadMessage');
            messageDiv.textContent = text;
            messageDiv.className = \`message \${type}\`;
            messageDiv.style.display = 'block';
            
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }

        // Gérer drag & drop
        document.addEventListener('DOMContentLoaded', function() {
            const dropArea = document.querySelector('.file-upload');
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, preventDefaults, false);
            });
            
            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropArea.addEventListener(eventName, () => {
                    dropArea.style.borderColor = '#4CAF50';
                }, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, () => {
                    dropArea.style.borderColor = '#555';
                }, false);
            });
            
            dropArea.addEventListener('drop', function(e) {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    handleFile(files[0]);
                    document.getElementById('fileInput').files = files;
                }
            }, false);
        });
    </script>
</body>
</html>`;
    
    res.send(html);
});

// ============ API ROUTES ============

// Route de test
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'API Minecraft Skin System',
        version: '1.0'
    });
});

// Upload skin/cape
app.post('/api/upload/:type', upload.single('file'), async (req, res) => {
    try {
        console.log('Upload request for:', req.params.type);
        
        const { type } = req.params;
        const { username } = req.body;
        
        if (!username || !username.trim()) {
            return res.status(400).json({ 
                success: false,
                error: 'Pseudo requis' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'Aucun fichier' 
            });
        }

        // Vérifier le fichier
        if (!req.file.mimetype.includes('png')) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                success: false,
                error: 'Format PNG requis' 
            });
        }

        // Lire le fichier
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileSize = fileBuffer.length;
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
        
        // Créer un ID unique
        const fileId = Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
        
        // Créer les données
        const fileData = {
            username: username.trim(),
            fileId: fileId,
            size: fileSize,
            hash: fileHash,
            lastDownload: new Date().toISOString(),
            type: type,
            filename: req.file.filename
        };

        // Créer le dossier de stockage
        const storageDir = path.join(__dirname, 'data', username.trim(), type);
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
        }

        // Sauvegarder le fichier
        const filePath = path.join(storageDir, `${fileId}.png`);
        fs.writeFileSync(filePath, fileBuffer);
        
        // Sauvegarder les métadonnées
        const metaPath = path.join(storageDir, `${fileId}.json`);
        fs.writeFileSync(metaPath, JSON.stringify(fileData, null, 2));
        
        // Mettre à jour le fichier du joueur
        updatePlayerFile(username.trim(), type, fileData);

        // Nettoyer
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: `${type === 'skin' ? 'Skin' : 'Cape'} uploadé`,
            data: fileData
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Erreur upload',
            details: error.message 
        });
    }
});

// Récupérer l'historique
app.get('/api/history/:type/:username', (req, res) => {
    try {
        const { type, username } = req.params;
        const userDir = path.join(__dirname, 'data', username.trim(), type);
        
        if (!fs.existsSync(userDir)) {
            return res.json([]);
        }
        
        // Lire tous les fichiers JSON
        const files = fs.readdirSync(userDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                const content = fs.readFileSync(path.join(userDir, file), 'utf8');
                return JSON.parse(content);
            })
            .sort((a, b) => new Date(b.lastDownload) - new Date(a.lastDownload));
        
        res.json(files);
    } catch (error) {
        res.json([]);
    }
});

// Récupérer le skin/cape actuel
app.get('/api/current/:type/:username', (req, res) => {
    try {
        const { type, username } = req.params;
        const userDir = path.join(__dirname, 'data', username.trim(), type);
        
        if (!fs.existsSync(userDir)) {
            return res.status(404).json({ error: 'Non trouvé' });
        }
        
        // Lire le fichier le plus récent
        const files = fs.readdirSync(userDir)
            .filter(file => file.endsWith('.json'))
            .sort()
            .reverse();
        
        if (files.length === 0) {
            return res.status(404).json({ error: 'Non trouvé' });
        }
        
        const latestFile = files[0];
        const content = fs.readFileSync(path.join(userDir, latestFile), 'utf8');
        res.json(JSON.parse(content));
    } catch (error) {
        res.status(404).json({ error: 'Non trouvé' });
    }
});

// Mettre à jour le fichier du joueur
function updatePlayerFile(username, type, fileData) {
    try {
        const playerFile = path.join(__dirname, 'data', 'players.json');
        let players = { players: [] };
        
        if (fs.existsSync(playerFile)) {
            const content = fs.readFileSync(playerFile, 'utf8');
            players = JSON.parse(content);
        }
        
        // Trouver ou créer le joueur
        let player = players.players.find(p => p.username === username);
        if (!player) {
            player = {
                username: username,
                skins: [],
                capes: []
            };
            players.players.push(player);
        }
        
        // Ajouter le fichier
        if (type === 'skin') {
            player.skins.unshift(fileData);
            if (player.skins.length > 10) player.skins = player.skins.slice(0, 10);
        } else {
            player.capes.unshift(fileData);
            if (player.capes.length > 10) player.capes = player.capes.slice(0, 10);
        }
        
        // Sauvegarder
        fs.writeFileSync(playerFile, JSON.stringify(players, null, 2));
    } catch (error) {
        console.error('Error updating player file:', error);
    }
}

// Servir les fichiers
app.get('/data/:username/:type/:filename', (req, res) => {
    const { username, type, filename } = req.params;
    const filePath = path.join(__dirname, 'data', username, type, filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Fichier non trouvé' });
    }
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
    console.log(`🎮 Interface: http://localhost:${PORT}`);
    console.log(`🔧 API Test: http://localhost:${PORT}/api/test`);
    
    // Créer les dossiers nécessaires
    const dirs = ['uploads', 'data'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`📁 Dossier créé: ${dir}`);
        }
    });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Erreur serveur',
        message: err.message 
    });
});
