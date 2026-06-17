import psycopg2

# Real production database URL
db_url = "postgresql://postgres:Applepie12356790@db.nfekvugmzzbtzmfqsfpu.supabase.co:5432/postgres"
event_id = "bf1c97c6-6caf-4664-91d5-cbd63d22cd21"

try:
    print(f"Connecting to real production database (nfekvugmzzbtzmfqsfpu)...")
    conn = psycopg2.connect(db_url, connect_timeout=5)
    cur = conn.cursor()
    
    # 1. Check if event exists
    cur.execute("SELECT id, name FROM public.events WHERE id = %s", (event_id,))
    event = cur.fetchone()
    print(f"Event query result: {event}")
    
    # 2. Check if processing_queue table exists
    cur.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = 'processing_queue'
        );
    """)
    queue_exists = cur.fetchone()[0]
    print(f"processing_queue table exists: {queue_exists}")
    
    # 3. Check columns on event_photos table
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'event_photos'
          AND column_name IN ('face_indexed', 'processing_time');
    """)
    columns = cur.fetchall()
    print(f"Columns on event_photos: {columns}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
