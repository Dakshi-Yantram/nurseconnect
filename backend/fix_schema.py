import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect(
        "postgresql://neondb_owner:npg_7h8ndoEzcTRs@ep-falling-math-aoiiv9lq.c-2.ap-southeast-1.aws.neon.tech/neondb?ssl=require"
    )
    await conn.execute("""
        ALTER TABLE escalations
        ADD COLUMN IF NOT EXISTS assigned_to UUID,
        ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS internal_notes VARCHAR,
        ADD COLUMN IF NOT EXISTS priority VARCHAR DEFAULT 'normal';
    """)
    print("Columns added successfully.")
    await conn.close()

asyncio.run(main())