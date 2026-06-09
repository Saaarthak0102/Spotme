import psycopg2
import sys

def main():
    dsn = "postgresql://postgres.lkxyzeofgsrybjbulthj:Applepie12356790@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
    print("Connecting to Supabase PostgreSQL database...")
    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        
        print("Adding processing_time column to public.event_photos...")
        cur.execute("""
            ALTER TABLE public.event_photos
            ADD COLUMN IF NOT EXISTS processing_time float DEFAULT 0.0;
        """)
        
        conn.commit()
        cur.close()
        conn.close()
        print("Migration applied successfully!")
    except Exception as e:
        print(f"Error applying migration: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
