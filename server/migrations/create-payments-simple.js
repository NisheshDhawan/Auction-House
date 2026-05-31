import { supabase } from '../config/supabase.js';

async function createPaymentsTable() {
  console.log('Creating payments table...');
  
  try {
    // Create payments table using direct SQL
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'payments')
      .eq('table_schema', 'public');

    if (error) {
      console.error('Error checking table existence:', error);
    }

    if (data && data.length > 0) {
      console.log('✅ Payments table already exists');
      return true;
    }

    // If table doesn't exist, we need to create it via Supabase dashboard or SQL editor
    console.log('❌ Payments table does not exist');
    console.log('Please create the payments table in Supabase dashboard with this SQL:');
    console.log(`
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL UNIQUE,
  payment_id VARCHAR(255),
  user_id UUID NOT NULL,
  listing_id UUID,
  product_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  status VARCHAR(50) DEFAULT 'created',
  type VARCHAR(50) NOT NULL,
  method VARCHAR(50),
  receipt VARCHAR(255),
  notes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
    `);

    return false;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}

createPaymentsTable();