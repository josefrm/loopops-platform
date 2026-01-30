-- Clean up existing empty sessions (sessions with no messages)
DELETE FROM sessions 
WHERE id NOT IN (
  SELECT DISTINCT session_id 
  FROM messages 
  WHERE session_id IS NOT NULL
);