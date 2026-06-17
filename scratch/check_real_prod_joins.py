import psycopg2

db_url = "postgresql://postgres:Applepie12356790@db.nfekvugmzzbtzmfqsfpu.supabase.co:5432/postgres"
event_id = "bf1c97c6-6caf-4664-91d5-cbd63d22cd21"

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    
    # 1. Check if the events table has owner_id
    cur.execute("SELECT owner_id FROM public.events WHERE id = %s", (event_id,))
    owner_id = cur.fetchone()[0]
    print(f"Owner ID of event: {owner_id}")
    
    # 2. Check if profiles table has this user
    cur.execute("SELECT id, full_name, email FROM public.profiles WHERE id = %s", (owner_id,))
    profile = cur.fetchone()
    print(f"Profile: {profile}")
    
    # Wait, profiles table has no email column in the SQL schema!
    # Let's check the schema.sql:
    # create table public.profiles (
    #   id             uuid primary key references auth.users(id) on delete cascade,
    #   full_name      text,
    #   avatar_url     text,
    #   role           text not null default 'photographer' check (role in ('admin', 'photographer')),
    #   phone          text,
    #   bio            text,
    #   plan           text not null default 'free' check (plan in ('free', 'pro', 'unlimited')),
    #   max_events     integer not null default 1,
    #   max_storage_gb integer not null default 10,
    #   created_at     timestamptz not null default now(),
    #   updated_at     timestamptz not null default now()
    # );
    # Wait! In schema.sql, there is NO 'email' column on the profiles table!
    # Let's check if the profiles table has an 'email' column!
    
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'email';
    """)
    email_col = cur.fetchone()
    print(f"email column exists in public.profiles: {email_col is not None}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
