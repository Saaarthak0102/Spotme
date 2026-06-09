import psycopg2
import sys

def main():
    dsn = "postgresql://postgres.lkxyzeofgsrybjbulthj:Applepie12356790@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require"
    print("Connecting to Supabase PostgreSQL database...")
    try:
        conn = psycopg2.connect(dsn)
        cur = conn.cursor()
        
        print("Adding embedding column to public.guest_selfies...")
        cur.execute("""
            ALTER TABLE public.guest_selfies
            ADD COLUMN IF NOT EXISTS embedding vector(512);
        """)
        
        print("Creating index guest_selfies_embedding_cosine_idx...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS guest_selfies_embedding_cosine_idx
            ON public.guest_selfies USING hnsw (embedding vector_cosine_ops);
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
