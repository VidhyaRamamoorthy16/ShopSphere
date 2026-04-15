import { useEffect, useState, useRef } from 'react';

const MONITOR = import.meta.env.VITE_MONITOR_URL || 'http://localhost:3000';
const WS_URL = `${MONITOR.replace('http', 'ws')}/ws/monitor`;

const useMonitorWS = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [requests, setRequests] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      try {
        wsRef.current = new WebSocket(WS_URL);

        wsRef.current.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };

        wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);
            
            if (data.type === 'request') {
              setRequests(prev => [data, ...prev].slice(0, 100));
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };

        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          // Reconnect after 3 seconds
          setTimeout(connect, 3000);
        };

        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          wsRef.current.close();
        };
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
        setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    requests
  };
};

export default useMonitorWS;
