-- Remove our configuration changes to restore defaults
BEGIN;
  -- Remove the realtime comment to restore default behavior
  COMMENT ON TABLE public.reactions IS NULL;
  
  -- Keep the replica identity setting for DELETE events
  ALTER TABLE reactions REPLICA IDENTITY FULL;
COMMIT; 