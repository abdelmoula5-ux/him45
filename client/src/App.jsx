import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import PollCreator from './components/PollCreator';
import PollViewer from './components/PollViewer';
import LiveResults from './components/LiveResults';

const backendUrl = import.meta.env.PROD ? '' : 'http://localhost:3001';
const socket = io(backendUrl || undefined);

function App() {
  const [currentPoll, setCurrentPoll] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    // Récupérer l'état initial
    fetch(`${backendUrl}/api/poll`)
      .then(res => res.json())
      .then(data => {
        if (data) setCurrentPoll(data);
      })
      .catch(console.error);

    socket.on('poll_updated', (poll) => {
      setCurrentPoll(poll);
    });

    return () => {
      socket.off('poll_updated');
    };
  }, []);

  const handleCreatePoll = async (pollData) => {
    try {
      const res = await fetch(`${backendUrl}/api/poll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pollData)
      });
      const data = await res.json();
      setCurrentPoll(data);
      setHasVoted(false);
    } catch (error) {
      console.error('Error creating poll:', error);
    }
  };

  const handleVote = (optionId) => {
    socket.emit('submit_vote', optionId);
    setHasVoted(true);
  };

  return (
    <div className="app-container">
      {!currentPoll ? (
        <PollCreator onCreate={handleCreatePoll} />
      ) : (
        <div className="glass-panel">
          <h1>{currentPoll.question}</h1>
          {!hasVoted ? (
            <PollViewer poll={currentPoll} onVote={handleVote} />
          ) : (
            <LiveResults poll={currentPoll} />
          )}
          <div className="text-center mt-4">
            <button 
              className="btn btn-secondary" 
              onClick={() => { setCurrentPoll(null); setHasVoted(false); }}
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Créer un nouveau sondage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
