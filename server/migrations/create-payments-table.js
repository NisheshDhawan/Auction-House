import { supabase } from '../config/supabase.js';

async function createPaymentsTable() {
  console.log('Creating payments table...');
  
  try {
    // Create payments table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS payments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          order_id VARCHAR(255) NOT NULL UNIQUE,
          payment_id VARCHAR(255),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
          product_id UUID REFERENCES products(id) ON DELETE SET NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'INR',
          status VARCHAR(50) DEFAULT 'created',
          type VARCHAR(50) NOT NULL, -- 'bid_payment', 'listing_fee', 'commission'
          method VARCHAR(50),
          receipt VARCHAR(255),
          notes JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
        CREATE INDEX IF NOT EXISTS idx_payments_listing_id ON payments(listing_id);
        CREATE INDEX IF NOT EXISTS idx_payments_product_id ON payments(product_id);
        CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
        CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
        CREATE INDEX IF NOT EXISTS idx_payments_type ON payments(type);
        CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

        -- Add RLS (Row Level Security) policies
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

        -- Policy: Users can only see their own payments
        CREATE POLICY "Users can view own payments" ON payments
          FOR SELECT USING (auth.uid() = user_id);

        -- Policy: Users can insert their own payments
        CREATE POLICY "Users can insert own payments" ON payments
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        -- Policy: Users can update their own payments
        CREATE POLICY "Users can update own payments" ON payments
          FOR UPDATE USING (auth.uid() = user_id);
      `
    });

    if (error) {
      console.error('Error creating payments table:', error);
      return false;
    }

    console.log('✅ Payments table created successfully');
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createPaymentsTable()
    .then((success) => {
      if (success) {
        console.log('Migration completed successfully');
        process.exit(0);
      } else {
        console.log('Migration failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

export { createPaymentsTable };