// Migration to create purchases table for tracking completed transactions
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createPurchasesTable() {
  console.log('Creating purchases table...');
  
  try {
    // Create purchases table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS purchases (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          product_name TEXT NOT NULL,
          product_image TEXT,
          category TEXT DEFAULT 'General',
          final_price DECIMAL(10,2) NOT NULL,
          seller_name TEXT,
          auction_end_date TIMESTAMPTZ,
          payment_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });

    if (tableError) {
      console.error('Error creating purchases table:', tableError);
      return;
    }

    // Create indexes for better performance
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
        CREATE INDEX IF NOT EXISTS idx_purchases_listing_id ON purchases(listing_id);
        CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
        CREATE INDEX IF NOT EXISTS idx_purchases_payment_id ON purchases(payment_id);
        CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
      `
    });

    if (indexError) {
      console.error('Error creating indexes:', indexError);
      return;
    }

    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
        
        -- Users can only see their own purchases
        CREATE POLICY "Users can view own purchases" ON purchases
          FOR SELECT USING (auth.uid() = user_id);
        
        -- Only authenticated users can insert purchases (via backend)
        CREATE POLICY "Authenticated users can insert purchases" ON purchases
          FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
        
        -- Users can update their own purchases
        CREATE POLICY "Users can update own purchases" ON purchases
          FOR UPDATE USING (auth.uid() = user_id);
      `
    });

    if (rlsError) {
      console.error('Error setting up RLS:', rlsError);
      return;
    }

    console.log('✅ Purchases table created successfully with RLS policies');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration
createPurchasesTable().then(() => {
  console.log('Purchases table migration completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});