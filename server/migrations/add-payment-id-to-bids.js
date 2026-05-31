import { supabase } from '../config/supabase.js';

async function addPaymentIdToBids() {
  console.log('Adding payment_id column to bids table...');
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add payment_id column to bids table if it doesn't exist
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'bids' AND column_name = 'payment_id'
          ) THEN
            ALTER TABLE bids ADD COLUMN payment_id VARCHAR(255);
            CREATE INDEX IF NOT EXISTS idx_bids_payment_id ON bids(payment_id);
          END IF;
        END $$;
      `
    });

    if (error) {
      console.error('Error adding payment_id to bids table:', error);
      return false;
    }

    console.log('✅ Payment_id column added to bids table successfully');
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addPaymentIdToBids()
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

export { addPaymentIdToBids };