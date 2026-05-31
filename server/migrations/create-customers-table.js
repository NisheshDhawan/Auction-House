import { supabase } from '../config/supabase.js';

async function createCustomersTable() {
  console.log('🔄 Creating customers table...');
  
  try {
    // Create customers table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS customers (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          customer_name TEXT NOT NULL,
          customer_email TEXT,
          first_purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_purchase_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          total_orders INTEGER NOT NULL DEFAULT 0,
          total_spent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          favorite_category TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(seller_id, customer_id)
        );
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_customers_seller_id ON customers(seller_id);
        CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
        CREATE INDEX IF NOT EXISTS idx_customers_total_spent ON customers(total_spent DESC);
        
        -- Create RLS policies
        ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
        
        -- Policy: Users can only see customers for their own seller account
        CREATE POLICY "Users can view their own customers" ON customers
          FOR SELECT USING (seller_id = auth.uid());
        
        -- Policy: Users can insert customers for their own seller account
        CREATE POLICY "Users can insert their own customers" ON customers
          FOR INSERT WITH CHECK (seller_id = auth.uid());
        
        -- Policy: Users can update customers for their own seller account
        CREATE POLICY "Users can update their own customers" ON customers
          FOR UPDATE USING (seller_id = auth.uid());
      `
    });

    if (error) {
      console.error('❌ Error creating customers table:', error);
      throw error;
    }

    console.log('✅ Customers table created successfully');
    
    // Verify table exists
    const { data: tableExists, error: checkError } = await supabase
      .from('customers')
      .select('count(*)', { count: 'exact', head: true });

    if (checkError) {
      console.error('❌ Error verifying customers table:', checkError);
    } else {
      console.log('✅ Customers table verified - ready to use');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createCustomersTable()
    .then(() => {
      console.log('✅ Customers table migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { createCustomersTable };