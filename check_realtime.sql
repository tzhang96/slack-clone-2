-- Check publication settings and realtime config
SELECT 
    p.pubname,
    pt.tablename,
    pt.schemaname,
    p.puballtables,
    obj_description(
        (quote_ident(pt.schemaname) || '.' || quote_ident(pt.tablename))::regclass, 
        'pg_class'
    ) as realtime_config
FROM pg_publication p
LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
WHERE p.pubname = 'supabase_realtime'
    OR pt.tablename = 'reactions'; 