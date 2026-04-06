import { useState, useEffect, useCallback } from 'react';

export const useEventStream = () => {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initial fetch of recent events
    fetch('/api/events/recent?count=50')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEvents(data);
        }
      })
      .catch(err => console.error("Failed to fetch recent events:", err));

    // Connect to SSE
    const eventSource = new EventSource('/api/events/stream');
    
    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const newEvent = JSON.parse(event.data);
        setEvents(prev => [...prev, newEvent].slice(-100)); // Keep last 100
      } catch (err) {
        console.error("Error parsing event:", err);
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
      // Simple reconnect logic could go here
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, connected, clearEvents };
};
