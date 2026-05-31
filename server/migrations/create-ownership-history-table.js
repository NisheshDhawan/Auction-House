// Migration to create ownership_history table for tracking product ownership transfers
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createOwnershipHistoryTable() {
  console.log('Creating ownership_history table...');
  
  try {
    // Create ownership_history table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ownership_history (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          
          -- Product and ownership details
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
          
          -- Owner information
          owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          previous_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
          
          -- Transaction details
          purchase_price DECIMAL(10,2) NOT NULL DEFAULT 0,
          payment_id TEXT,
          acquisition_method VARCHAR(50) DEFAULT 'auction', -- 'auction', 'direct_sale', 'transfer', 'original'
          
          -- Status and dates
          acquired_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          sold_date TIMESTAMPTZ,
          is_current_owner BOOLEAN DEFAULT true,
          payment_status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'pending', 'failed'
          
          -- Metadata
          notes JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          -- Constraints
          CONSTRAINT valid_acquisition_method CHECK (
            acquisition_method IN ('auction', 'direct_sale', 'transfer', 'original')
          ),
          CONSTRAINT valid_payment_status CHECK (
            payment_status IN ('completed', 'pending', 'failed')
          )
        );
      `
    });

    if (tableError) {
      console.error('Error creating ownership_history table:', tableError);
      return;
    }

    // Create indexes for better performance
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_ownership_product_id ON ownership_history(product_id);
        CREATE INDEX IF NOT EXISTS idx_ownership_owner_id ON ownership_history(owner_id);
        CREATE INDEX IF NOT EXISTS idx_ownership_previous_owner ON ownership_history(previous_owner_id);
        CREATE INDEX IF NOT EXISTS idx_ownership_listing_id ON ownership_history(listing_id);
        CREATE INDEX IF NOT EXISTS idx_ownership_current_owner ON ownership_history(is_current_owner);
        CREATE INDEX IF NOT EXISTS idx_ownership_acquired_date ON ownership_history(acquired_date);
        CREATE INDEX IF NOT EXISTS idx_ownership_payment_id ON ownership_history(payment_id);
        
        -- Composite indexes for common queries
        CREATE INDEX IF NOT EXISTS idx_ownership_product_current ON ownership_history(product_id, is_current_owner);
        CREATE INDEX IF NOT EXISTS idx_ownership_owner_current ON ownership_history(owner_id, is_current_owner);
      `
    });

    if (indexError) {
      console.error('Error creating indexes:', indexError);
      return;
    }

    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE ownership_history ENABLE ROW LEVEL SECURITY;
        
        -- Users can view ownership history for products they own or have owned
        CREATE POLICY "Users can view related ownership history" ON ownership_history
          FOR SELECT USING (
            auth.uid() = owner_id OR 
            auth.uid() = previous_owner_id OR
            EXISTS (
              SELECT 1 FROM products 
              WHERE products.id = ownership_history.product_id 
              AND products.seller_id = auth.uid()
            )
          );
        
        -- Only authenticated users can insert ownership records (via backend)
        CREATE POLICY "Authenticated users can insert ownership" ON ownership_history
          FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
        
        -- Users can update ownership records they're involved in
        CREATE POLICY "Users can update related ownership" ON ownership_history
          FOR UPDATE USING (
            auth.uid() = owner_id OR 
            auth.uid() = previous_owner_id
          );
        
        -- Admin users can view all ownership history
        CREATE POLICY "Admins can view all ownership history" ON ownership_history
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE users.id = auth.uid() 
              AND users.role = 'admin'
            )
          );
      `
    });

    if (rlsError) {
      console.error('Error setting up RLS:', rlsError);
      return;
    }

    // Create trigger for auto-updating timestamps
    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Function to update the updated_at timestamp
        CREATE OR REPLACE FUNCTION update_ownership_updated_at()
        RETURNS TRIGGER AS $
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $ language 'plpgsql';

        -- Trigger to automatically update updated_at
        CREATE TRIGGER update_ownership_history_updated_at 
          BEFORE UPDATE ON ownership_history 
          FOR EACH ROW 
          EXECUTE FUNCTION update_ownership_updated_at();
      `
    });

    if (triggerError) {
      console.error('Error creating triggers:', triggerError);
      return;
    }

    // Create useful views for analytics
    const { error: viewError } = await supabase.rpc('exec_sql', {
      sql: `
        -- View: Current ownership status
        CREATE OR REPLACE VIEW current_ownership AS
        SELECT 
          oh.product_id,
          oh.owner_id,
          u.full_name as owner_name,
          u.email as owner_email,
          oh.acquired_date,
          oh.purchase_price,
          oh.acquisition_method,
          p.name as product_name,
          p.base_price as original_price
        FROM ownership_history oh
        JOIN users u ON oh.owner_id = u.id
        JOIN products p ON oh.product_id = p.id
        WHERE oh.is_current_owner = true;

        -- View: Product ownership timeline
        CREATE OR REPLACE VIEW product_ownership_timeline AS
        SELECT 
          oh.product_id,
          p.name as product_name,
          p.base_price as original_price,
          oh.owner_id,
          u.full_name as owner_name,
          u.email as owner_email,
          oh.previous_owner_id,
          prev_u.full_name as previous_owner_name,
          oh.acquired_date,
          oh.sold_date,
          oh.purchase_price,
          oh.acquisition_method,
          oh.is_current_owner,
          oh.payment_status
        FROM ownership_history oh
        JOIN users u ON oh.owner_id = u.id
        JOIN products p ON oh.product_id = p.id
        LEFT JOIN users prev_u ON oh.previous_owner_id = prev_u.id
        ORDER BY oh.product_id, oh.acquired_date;

        -- View: Seller ownership analytics
        CREATE OR REPLACE VIEW seller_ownership_analytics AS
        SELECT 
          p.seller_id as original_seller_id,
          seller.full_name as original_seller_name,
          COUNT(DISTINCT oh.product_id) as products_sold,
          COUNT(oh.id) as total_ownership_transfers,
          SUM(oh.purchase_price) as total_revenue,
          AVG(oh.purchase_price) as average_sale_price,
          MAX(oh.purchase_price) as highest_sale_price,
          MIN(oh.purchase_price) as lowest_sale_price
        FROM ownership_history oh
        JOIN products p ON oh.product_id = p.id
        JOIN users seller ON p.seller_id = seller.id
        WHERE oh.acquisition_method != 'original'
        GROUP BY p.seller_id, seller.full_name;
      `
    });

    if (viewError) {
      console.error('Error creating views:', viewError);
      return;
    }

    console.log('✅ Ownership history table created successfully with:');
    console.log('   - Complete ownership tracking');
    console.log('   - RLS policies for security');
    console.log('   - Indexes for performance');
    console.log('   - Analytics views');
    console.log('   - Auto-update triggers');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration
createOwnershipHistoryTable().then(() => {
  console.log('Ownership history table migration completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});