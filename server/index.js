import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Permet toutes les origines en développement
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// État en mémoire du sondage actif
let currentPoll = null;

// Route pour récupérer le sondage courant
app.get('/api/poll', (req, res) => {
  res.json(currentPoll);
});

// Route pour créer un nouveau sondage
app.post('/api/poll', (req, res) => {
  const { question, options } = req.body;
  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Données de sondage invalides' });
  }

  currentPoll = {
    id: Date.now().toString(),
    question,
    options: options.map((opt, index) => ({
      id: index.toString(),
      text: opt,
      votes: 0
    }))
  };

  // Diffuser le nouveau sondage à tous les clients connectés
  io.emit('poll_updated', currentPoll);
  
  res.status(201).json(currentPoll);
});

// Gestion des connexions Socket.io
io.on('connection', (socket) => {
  console.log(`Nouveau client connecté: ${socket.id}`);

  // Envoyer l'état actuel au nouveau client
  if (currentPoll) {
    socket.emit('poll_updated', currentPoll);
  }

  // Gérer la réception d'un vote
  socket.on('submit_vote', (optionId) => {
    if (currentPoll) {
      const optionIndex = currentPoll.options.findIndex(opt => opt.id === optionId);
      if (optionIndex !== -1) {
        currentPoll.options[optionIndex].votes += 1;
        
        // Diffuser de manière instantanée le sondage mis à jour à tous les clients
        io.emit('poll_updated', currentPoll);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client déconnecté: ${socket.id}`);
  });
});

// En production (sur Azure, process.env.WEBSITE_SITE_NAME est défini), on sert les fichiers statiques Vite
if (process.env.NODE_ENV === 'production' || process.env.WEBSITE_SITE_NAME) {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Le port utilisé par Azure (WEBSITES_PORT) ou par défaut
const PORT = process.env.PORT || process.env.WEBSITES_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Serveur Node.js/Socket.io opérationnel sur le port ${PORT}`);
});
