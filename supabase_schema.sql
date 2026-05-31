-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    password text not null,
    full_name text not null,
    date_of_birth date,
    gender text,
    mobile_number text,
    address text,
    pincode text,
    state text,
    avatar_url text,
    email_verified boolean default false,
    role text default 'user',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. CATEGORIES TABLE
create table if not exists categories (
    id uuid primary key default gen_random_uuid(),
    name text unique not null,
    description text,
    created_by uuid references users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. CATEGORY REQUESTS TABLE
create table if not exists category_requests (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    reason text,
    status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
    requested_by uuid references users(id) on delete cascade not null,
    reviewed_by uuid references users(id) on delete set null,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. PRODUCTS TABLE
create table if not exists products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    base_price numeric(12, 2) not null check (base_price > 0),
    category_id uuid references categories(id) on delete set null,
    image_url text, -- supports base64 image strings or URLs
    seller_id uuid references users(id) on delete cascade not null,
    status text default 'active' check (status in ('active', 'inactive', 'sold')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. LISTINGS TABLE (Auctions)
create table if not exists listings (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    product_id uuid references products(id) on delete cascade not null,
    seller_id uuid references users(id) on delete cascade not null,
    starting_bid numeric(12, 2) not null check (starting_bid >= 0),
    current_bid numeric(12, 2) not null check (current_bid >= starting_bid),
    bid_increment numeric(12, 2) default 500.00 check (bid_increment > 0),
    status text default 'pending' check (status in ('pending', 'active', 'ended', 'cancelled')),
    start_date timestamp with time zone not null,
    end_date timestamp with time zone not null check (end_date > start_date),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. BIDS TABLE
create table if not exists bids (
    id uuid primary key default gen_random_uuid(),
    listing_id uuid references listings(id) on delete cascade not null,
    bidder_id uuid references users(id) on delete cascade not null,
    amount numeric(12, 2) not null check (amount > 0),
    is_winning boolean default true,
    payment_id text, -- set after winner pays
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. PAYMENTS TABLE (Razorpay transactions)
create table if not exists payments (
    id uuid primary key default gen_random_uuid(),
    order_id text unique not null,
    payment_id text,
    user_id uuid references users(id) on delete cascade not null,
    listing_id uuid references listings(id) on delete set null,
    product_id uuid references products(id) on delete set null,
    amount numeric(12, 2) not null check (amount >= 0),
    currency text default 'INR',
    status text not null, -- created, captured, failed, etc.
    type text not null, -- bid_payment, listing_fee, purchase_payment
    receipt text,
    method text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. PURCHASES TABLE (Ownership history tracker)
create table if not exists purchases (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references users(id) on delete cascade not null, -- buyer
    listing_id uuid references listings(id) on delete set null,
    product_id uuid references products(id) on delete set null,
    product_name text not null,
    product_image text,
    category uuid references categories(id) on delete set null, -- Category ID
    final_price numeric(12, 2) not null check (final_price >= 0),
    seller_name text,
    auction_end_date timestamp with time zone not null,
    payment_id text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. CUSTOMERS TABLE (Seller client CRM)
create table if not exists customers (
    id uuid primary key default gen_random_uuid(),
    seller_id uuid references users(id) on delete cascade not null,
    customer_id uuid references users(id) on delete cascade not null,
    customer_name text not null,
    customer_email text,
    first_purchase_date timestamp with time zone not null,
    last_purchase_date timestamp with time zone not null,
    total_orders integer default 1 check (total_orders >= 0),
    total_spent numeric(12, 2) default 0.00 check (total_spent >= 0),
    favorite_category text, -- Category name or text representation
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (seller_id, customer_id)
);

-- Create Indexes for performance
create index if not exists idx_users_email on users(email);
create index if not exists idx_products_seller on products(seller_id);
create index if not exists idx_products_status on products(status);
create index if not exists idx_listings_status on listings(status);
create index if not exists idx_listings_product on listings(product_id);
create index if not exists idx_bids_listing on bids(listing_id);
create index if not exists idx_bids_bidder on bids(bidder_id);
create index if not exists idx_bids_winning on bids(is_winning);
create index if not exists idx_payments_order_id on payments(order_id);
create index if not exists idx_payments_user on payments(user_id);
create index if not exists idx_purchases_user on purchases(user_id);
create index if not exists idx_customers_seller_customer on customers(seller_id, customer_id);

-- Seed Default Categories
insert into categories (name, description) values
('Ceramics', 'Handmade pottery, clay creations, and ceramic artwork'),
('Digital Art', 'Digital paintings, illustrations, 3D renders, and NFTs'),
('Textiles', 'Woven crafts, clothing, rugs, and embroidery'),
('Sculptures', 'Stone, metal, wood, or clay hand-carved sculptures'),
('Paintings', 'Acrylic, oil, watercolor, and canvas paintings'),
('Jewelry', 'Handcrafted rings, necklaces, bracelets, and gem-work')
on conflict (name) do nothing;
