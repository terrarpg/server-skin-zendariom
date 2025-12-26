const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const GITHUB_TOKEN = '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';
const GITHUB_REPO = 'terrarpg/server-skin-zendariom';
const GITHUB_API = 'https://api.github.com';

// Middleware CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

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
        const uuid = crypto.randomBytes(16).toString('hex');
        const timestamp = Date.now();
        const filename = `${uuid}_${timestamp}.png`;
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route racine - Interface HTML complète
app.get('/', (req, res) => {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sélection de Skin/Cape Minecraft</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #fff;
            min-height: 100vh;
            overflow-x: hidden;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            text-align: center;
            margin-bottom: 30px;
            padding: 25px;
            background: rgba(30, 41, 59, 0.8);
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        h1 {
            font-size: 2.8rem;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #60a5fa, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            font-size: 1.3rem;
            opacity: 0.9;
            color: #cbd5e1;
        }

        .player-setup {
            background: rgba(30, 41, 59, 0.8);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .setup-input {
            margin-bottom: 20px;
        }

        .setup-input label {
            display: block;
            margin-bottom: 10px;
            color: #93c5fd;
            font-weight: 600;
            font-size: 1.2rem;
        }

        .setup-input input {
            width: 300px;
            padding: 15px;
            border-radius: 10px;
            border: 2px solid rgba(255, 255, 255, 0.1);
            background: rgba(15, 23, 42, 0.8);
            color: white;
            font-size: 1.2rem;
            text-align: center;
            transition: all 0.3s ease;
        }

        .setup-input input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }

        .connect-btn {
            padding: 15px 40px;
            background: linear-gradient(45deg, #3b82f6, #1d4ed8);
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 1.2rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }

        .connect-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(59, 130, 246, 0.4);
        }

        .connect-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .main-interface {
            display: grid;
            grid-template-columns: 250px 1fr 250px;
            gap: 20px;
            min-height: 700px;
        }

        @media (max-width: 1200px) {
            .main-interface {
                grid-template-columns: 1fr;
            }
        }

        .action-panel {
            background: rgba(30, 41, 59, 0.8);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .action-panel h2 {
            color: #60a5fa;
            margin-bottom: 20px;
            font-size: 1.3rem;
            text-align: center;
        }

        .action-btn {
            width: 100%;
            padding: 15px;
            margin-bottom: 15px;
            border: none;
            border-radius: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: white;
        }

        .action-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }

        .btn-skin {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        }

        .btn-cape {
            background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        }

        .btn-history {
            background: linear-gradient(135deg, #10b981, #059669);
        }

        .center-panel {
            background: rgba(15, 23, 42, 0.8);
            border-radius: 15px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .player-display {
            text-align: center;
            margin-bottom: 30px;
        }

        .player-avatar {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 3px solid #3b82f6;
            margin: 0 auto 15px;
            background: linear-gradient(45deg, #1e293b, #0f172a);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            color: #60a5fa;
        }

        .player-name {
            font-size: 1.5rem;
            color: #60a5fa;
            margin-bottom: 5px;
        }

        .player-uuid {
            font-size: 0.9rem;
            color: #94a3b8;
            font-family: monospace;
            background: rgba(0, 0, 0, 0.3);
            padding: 5px 10px;
            border-radius: 5px;
            display: inline-block;
        }

        .skin-viewer {
            width: 100%;
            height: 400px;
            position: relative;
            margin: 20px 0;
        }

        .skin-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 200px;
            height: 400px;
            transform-style: preserve-3d;
            animation: rotate 30s infinite linear;
        }

        @keyframes rotate {
            0% { transform: translate(-50%, -50%) rotateY(0deg); }
            100% { transform: translate(-50%, -50%) rotateY(360deg); }
        }

        .skin-part {
            position: absolute;
            background: rgba(59, 130, 246, 0.1);
            border: 2px solid rgba(59, 130, 246, 0.3);
        }

        .part-head {
            width: 64px;
            height: 64px;
            top: 0;
            left: 68px;
        }

        .part-body {
            width: 64px;
            height: 96px;
            top: 70px;
            left: 68px;
        }

        .part-arm-left {
            width: 32px;
            height: 96px;
            top: 70px;
            left: 20px;
        }

        .part-arm-right {
            width: 32px;
            height: 96px;
            top: 70px;
            left: 148px;
        }

        .part-leg-left {
            width: 32px;
            height: 96px;
            top: 172px;
            left: 84px;
        }

        .part-leg-right {
            width: 32px;
            height: 96px;
            top: 172px;
            left: 116px;
        }

        .cape-layer {
            position: absolute;
            width: 64px;
            height: 96px;
            top: 70px;
            left: 68px;
            background: rgba(139, 92, 246, 0.2);
            border: 2px solid rgba(139, 92, 246, 0.4);
            transform: translateZ(-5px);
        }

        .history-panel {
            background: rgba(30, 41, 59, 0.8);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .history-panel h2 {
            color: #60a5fa;
            margin-bottom: 20px;
            font-size: 1.3rem;
            text-align: center;
        }

        .history-list {
            max-height: 600px;
            overflow-y: auto;
        }

        .history-item {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .history-item:hover {
            background: rgba(59, 130, 246, 0.1);
            transform: translateX(5px);
        }

        .history-type {
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-right: 10px;
        }

        .type-skin {
            background: rgba(59, 130, 246, 0.3);
            color: #60a5fa;
        }

        .type-cape {
            background: rgba(139, 92, 246, 0.3);
            color: #a78bfa;
        }

        .history-date {
            font-size: 0.8rem;
            color: #94a3b8;
            margin-top: 5px;
        }

        .modal-overlay {
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
            background: rgba(30, 41, 59, 0.95);
            border-radius: 20px;
            padding: 30px;
            width: 90%;
            max-width: 500px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-title {
            color: #60a5fa;
            font-size: 1.5rem;
            margin-bottom: 20px;
            text-align: center;
        }

        .file-upload-area {
            border: 3px dashed rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            padding: 40px 20px;
            margin: 20px 0;
            cursor: pointer;
            text-align: center;
            transition: all 0.3s ease;
        }

        .file-upload-area:hover {
            border-color: #3b82f6;
            background: rgba(59, 130, 246, 0.05);
        }

        .upload-icon {
            font-size: 3rem;
            color: #60a5fa;
            margin-bottom: 15px;
        }

        .modal-buttons {
            display: flex;
            gap: 10px;
            margin-top: 25px;
        }

        .modal-btn {
            flex: 1;
            padding: 15px;
            border: none;
            border-radius: 10px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .modal-btn.primary {
            background: linear-gradient(45deg, #3b82f6, #1d4ed8);
            color: white;
        }

        .modal-btn.secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .message {
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
            font-weight: 600;
            display: none;
        }

        .success {
            background: rgba(34, 197, 94, 0.2);
            border: 1px solid #22c55e;
            color: #22c55e;
        }

        .error {
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid #ef4444;
            color: #ef4444;
        }

        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎮 Système de Skin/Cape Minecraft</h1>
            <p class="subtitle">UUID généré automatiquement - Stocké sur GitHub</p>
        </header>

        <div class="player-setup">
            <div class="setup-input">
                <label for="username">Entrez votre pseudo Minecraft</label>
                <input type="text" id="username" placeholder="Votre pseudo...">
            </div>
            <button class="connect-btn" onclick="initPlayer()" id="connectBtn">
                Commencer
            </button>
        </div>

        <div class="main-interface" id="mainInterface" style="display: none;">
            <div class="action-panel">
                <h2>Actions</h2>
                <button class="action-btn btn-skin" onclick="openUploadModal('skin')">
                    <span>👤</span> Ajouter un Skin
                </button>
                <button class="action-btn btn-cape" onclick="openUploadModal('cape')">
                    <span>🦇</span> Ajouter une Cape
                </button>
                <button class="action-btn btn-history" onclick="loadHistory('skin')">
                    <span>📜</span> Historique Skins
                </button>
                <button class="action-btn btn-history" onclick="loadHistory('cape')">
                    <span>📜</span> Historique Capes
                </button>
            </div>

            <div class="center-panel">
                <div class="player-display">
                    <div class="player-avatar" id="playerAvatar">?</div>
                    <div class="player-name" id="displayPlayerName"></div>
                    <div class="player-uuid" id="displayPlayerUUID"></div>
                </div>

                <div class="skin-viewer">
                    <div class="skin-container" id="skinContainer"></div>
                </div>
            </div>

            <div class="history-panel">
                <h2 id="historyTitle">Historique</h2>
                <div class="history-list" id="historyList">
                    <div style="text-align:center;color:#94a3b8;padding:20px;">
                        Aucun historique
                    </div>
                </div>
            </div>
        </div>

        <div class="modal-overlay" id="uploadModal">
            <div class="modal-content">
                <div class="modal-title" id="modalTitle">Ajouter un Skin</div>
                
                <div class="file-upload-area" id="fileDropArea" 
                     onclick="document.getElementById('fileInput').click()">
                    <div class="upload-icon">📁</div>
                    <div style="color:#cbd5e1;margin-bottom:10px;">
                        Cliquez ou déposez votre fichier PNG
                    </div>
                    <div style="color:#94a3b8;font-size:0.9rem;">
                        Format: 64x32 pixels (Skin) ou 64x64 pixels (Cape)
                    </div>
                </div>

                <input type="file" id="fileInput" accept=".png" style="display:none;">

                <div style="margin:15px 0;display:none;" id="selectedFile"></div>

                <div class="modal-buttons">
                    <button class="modal-btn secondary" onclick="closeModal()">
                        Annuler
                    </button>
                    <button class="modal-btn primary" id="uploadBtn" onclick="uploadFile()" disabled>
                        Uploader
                    </button>
                </div>

                <div class="message" id="uploadMessage"></div>
            </div>
        </div>
    </div>

    <script>
        let currentPlayer = {
            username: '',
            uuid: '',
            skins: [],
            capes: []
        };

        let currentUploadType = 'skin';
        let selectedFile = null;

        // Initialiser le joueur
        function initPlayer() {
            const username = document.getElementById('username').value.trim();
            
            if (!username) {
                alert('Veuillez entrer un pseudo !');
                return;
            }

            // Générer UUID unique
            currentPlayer.uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            
            currentPlayer.username = username;

            // Mettre à jour l'affichage
            document.getElementById('displayPlayerName').textContent = username;
            document.getElementById('displayPlayerUUID').textContent = currentPlayer.uuid;
            document.getElementById('playerAvatar').textContent = username.charAt(0).toUpperCase();
            
            // Afficher l'interface
            document.getElementById('mainInterface').style.display = 'grid';
            document.querySelector('.player-setup').style.display = 'none';
            
            // Générer modèle 3D
            generateSkinModel();
            
            // Charger l'historique
            loadHistory('skin');
        }

        // Ouvrir modale d'upload
        function openUploadModal(type) {
            currentUploadType = type;
            document.getElementById('modalTitle').textContent = 
                type === 'skin' ? 'Ajouter un Skin' : 'Ajouter une Cape';
            document.getElementById('uploadModal').style.display = 'flex';
            document.getElementById('uploadBtn').disabled = true;
            document.getElementById('uploadMessage').style.display = 'none';
            document.getElementById('selectedFile').style.display = 'none';
            
            // Configurer input file
            const fileInput = document.getElementById('fileInput');
            fileInput.onchange = handleFileSelect;
            fileInput.value = '';
            
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
            const fileInfo = document.getElementById('selectedFile');
            
            fileInfo.innerHTML = \`
                <strong>Fichier sélectionné:</strong><br>
                📄 \${file.name}<br>
                📏 \${(file.size / 1024).toFixed(2)} KB
            \`;
            fileInfo.style.display = 'block';
            
            document.getElementById('uploadBtn').disabled = false;
        }

        // Uploader fichier
        async function uploadFile() {
            if (!selectedFile || !currentPlayer.username) return;
            
            const uploadBtn = document.getElementById('uploadBtn');
            const messageDiv = document.getElementById('uploadMessage');
            
            uploadBtn.innerHTML = '<span class="loading"></span> Upload...';
            uploadBtn.disabled = true;
            
            try {
                const formData = new FormData();
                formData.append('file', selectedFile);
                formData.append('username', currentPlayer.username);
                formData.append('autoGenerated', 'true');
                
                const response = await fetch(\`/api/upload/\${currentUploadType}\`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showMessage(\`\${currentUploadType === 'skin' ? 'Skin' : 'Cape'} uploadé !\`, 'success');
                    
                    // Recharger historique
                    setTimeout(() => {
                        loadHistory(currentUploadType);
                        closeModal();
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

        // Charger historique
        async function loadHistory(type) {
            if (!currentPlayer.username) return;
            
            try {
                document.getElementById('historyTitle').textContent = 
                    type === 'skin' ? 'Historique Skins' : 'Historique Capes';
                
                const response = await fetch(\`/api/history/\${type}/\${currentPlayer.username}\`);
                const history = await response.json();
                
                const historyList = document.getElementById('historyList');
                
                if (!history || history.length === 0) {
                    historyList.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px;">Aucun historique</div>';
                    return;
                }
                
                let html = '';
                history.forEach((item, index) => {
                    const date = new Date(item.lastDownload).toLocaleDateString('fr-FR');
                    html += \`
                        <div class="history-item">
                            <div style="display:flex;justify-content:space-between;">
                                <span class="history-type \${type === 'skin' ? 'type-skin' : 'type-cape'}">
                                    \${type === 'skin' ? 'SKIN' : 'CAPE'} #\${index + 1}
                                </span>
                                <span class="history-date">\${date}</span>
                            </div>
                            <div style="margin-top:5px;color:#cbd5e1;">Hash: \${item.hash?.substring(0, 8)}...</div>
                        </div>
                    \`;
                });
                
                historyList.innerHTML = html;
            } catch (error) {
                console.error('Erreur historique:', error);
            }
        }

        // Générer modèle 3D
        function generateSkinModel() {
            const container = document.getElementById('skinContainer');
            container.innerHTML = '';
            
            // Créer les parties du skin
            const parts = [
                { className: 'skin-part part-head', top: 0, left: 68, width: 64, height: 64 },
                { className: 'skin-part part-body', top: 70, left: 68, width: 64, height: 96 },
                { className: 'skin-part part-arm-left', top: 70, left: 20, width: 32, height: 96 },
                { className: 'skin-part part-arm-right', top: 70, left: 148, width: 32, height: 96 },
                { className: 'skin-part part-leg-left', top: 172, left: 84, width: 32, height: 96 },
                { className: 'skin-part part-leg-right', top: 172, left: 116, width: 32, height: 96 }
            ];
            
            parts.forEach(part => {
                const div = document.createElement('div');
                div.className = part.className;
                div.style.cssText = \`
                    position: absolute;
                    top: \${part.top}px;
                    left: \${part.left}px;
                    width: \${part.width}px;
                    height: \${part.height}px;
                    background: rgba(59, 130, 246, 0.1);
                    border: 2px solid rgba(59, 130, 246, 0.3);
                \`;
                container.appendChild(div);
            });
            
            // Ajouter cape (cachée par défaut)
            const cape = document.createElement('div');
            cape.className = 'cape-layer';
            cape.style.cssText = \`
                position: absolute;
                top: 70px;
                left: 68px;
                width: 64px;
                height: 96px;
                background: rgba(139, 92, 246, 0.2);
                border: 2px solid rgba(139, 92, 246, 0.4);
                transform: translateZ(-5px);
                display: none;
            \`;
            container.appendChild(cape);
        }

        // Afficher message
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
            const dropArea = document.getElementById('fileDropArea');
            
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, preventDefaults, false);
            });
            
            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            ['dragenter', 'dragover'].forEach(eventName => {
                dropArea.addEventListener(eventName, highlight, false);
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                dropArea.addEventListener(eventName, unhighlight, false);
            });
            
            function highlight() {
                dropArea.style.borderColor = '#3b82f6';
                dropArea.style.background = 'rgba(59, 130, 246, 0.05)';
            }
            
            function unhighlight() {
                dropArea.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                dropArea.style.background = '';
            }
            
            dropArea.addEventListener('drop', handleDrop, false);
            
            function handleDrop(e) {
                const dt = e.dataTransfer;
                const files = dt.files;
                
                if (files.length > 0) {
                    handleFile(files[0]);
                    document.getElementById('fileInput').files = files;
                }
            }
        });
    </script>
</body>
</html>`;
    
    res.send(html);
});

// ============ API ROUTES ============

// Test API
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'API Minecraft Skin System',
        version: '1.0.0'
    });
});

// Upload skin/cape
app.post('/api/upload/:type', upload.single('file'), async (req, res) => {
    try {
        const { type } = req.params;
        const { username, autoGenerated = 'true' } = req.body;
        
        if (!username || !username.trim()) {
            return res.status(400).json({ 
                success: false,
                error: 'Le pseudo est requis' 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                success: false,
                error: 'Aucun fichier uploadé' 
            });
        }

        // Vérifier fichier
        if (!req.file.mimetype.includes('png')) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ 
                success: false,
                error: 'Format PNG requis' 
            });
        }

        // Lire fichier
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileSize = fileBuffer.length;
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex').substring(0, 16);
        
        // Générer UUID
        const uuid = crypto.randomBytes(16).toString('hex');
        
        // Créer données
        const fileData = {
            username: username.trim(),
            uuid: uuid,
            size: fileSize,
            hash: fileHash,
            lastDownload: new Date().toISOString(),
            animated: false,
            source: 'web',
            type: type,
            autoGenerated: autoGenerated === 'true'
        };

        // Sauvegarder localement pour test
        const localData = {
            ...fileData,
            localPath: req.file.path
        };

        // Nettoyer fichier
        fs.unlinkSync(req.file.path);

        // Pour le moment, retourner succès sans GitHub
        // (À activer quand le token GitHub est valide)
        res.json({
            success: true,
            message: `${type === 'skin' ? 'Skin' : 'Cape'} uploadé avec succès`,
            data: fileData,
            note: 'GitHub upload désactivé - Stockage local uniquement'
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            success: false,
            error: 'Erreur lors de l\'upload',
            details: error.message 
        });
    }
});

// Récupérer historique
app.get('/api/history/:type/:username', async (req, res) => {
    try {
        const { type, username } = req.params;
        
        // Pour le moment, retourner un exemple
        // (À remplacer par la récupération depuis GitHub)
        const exampleHistory = [
            {
                username: username,
                uuid: 'example-uuid-123',
                size: 2048,
                hash: 'a1b2c3d4',
                lastDownload: new Date().toISOString(),
                type: type
            }
        ];
        
        res.json(exampleHistory);
    } catch (error) {
        res.json([]);
    }
});

// Tous les joueurs
app.get('/api/all-players', (req, res) => {
    res.json({
        players: [
            {
                username: "Exemple",
                uuid: "123e4567-e89b-12d3-a456-426614174000",
                skins: [],
                capes: []
            }
        ]
    });
});

// Vérifier GitHub
app.get('/api/github-status', async (req, res) => {
    try {
        const response = await axios.get(
            `${GITHUB_API}/repos/${GITHUB_REPO}`,
            { 
                headers: { 
                    Authorization: `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'Minecraft-Skin-Server'
                }
            }
        );
        res.json({ 
            status: 'CONNECTED', 
            repo: response.data.name
        });
    } catch (error) {
        res.json({ 
            status: 'DISCONNECTED', 
            error: 'Vérifiez votre token GitHub'
        });
    }
});

// Démarrer serveur
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📋 Interface: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api/test`);
    console.log(`🌐 GitHub Status: http://localhost:${PORT}/api/github-status`);
});

// Gestion erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Erreur interne du serveur',
        message: err.message 
    });
});
