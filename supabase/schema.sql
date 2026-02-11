-- Create profiles table for users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT CHECK (role IN ('admin', 'librarian', 'patron')) DEFAULT 'patron',
  current_checkouts INTEGER DEFAULT 0,
  fines_due DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  isbn TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT[],
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('available', 'low_stock', 'unavailable')) DEFAULT 'available',
  location TEXT,
  publisher TEXT,
  published_year INTEGER,
  description TEXT,
  cover_image TEXT,
  metadata JSONB DEFAULT '{}',
  added_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create patrons table (for detailed library membership)
CREATE TABLE IF NOT EXISTS patrons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  address JSONB,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  membership_status TEXT CHECK (membership_status IN ('active', 'expired', 'suspended')) DEFAULT 'active',
  membership_type TEXT CHECK (membership_type IN ('standard', 'premium', 'student')) DEFAULT 'standard',
  fines_due DECIMAL(10,2) DEFAULT 0.00,
  current_checkouts INTEGER DEFAULT 0,
  max_books_allowed INTEGER DEFAULT 5,
  total_checkouts_history INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create checkouts table
CREATE TABLE IF NOT EXISTS checkouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) NOT NULL,
  patron_id UUID REFERENCES patrons(id) NOT NULL,
  checkout_date TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  returned_date TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'overdue', 'returned', 'lost')) DEFAULT 'active',
  renewals_count INTEGER DEFAULT 0,
  max_renewals INTEGER DEFAULT 2,
  fine_accrued DECIMAL(10,2) DEFAULT 0.00,
  checked_out_by UUID REFERENCES auth.users(id),
  returned_to UUID REFERENCES auth.users(id),
  notes TEXT,
  book_title TEXT,
  book_isbn TEXT,
  patron_name TEXT,
  patron_member_id TEXT
);

-- Create borrow_requests table
CREATE TABLE IF NOT EXISTS borrow_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) NOT NULL,
  patron_id UUID REFERENCES patrons(id) NOT NULL,
  requester_name TEXT,
  book_title TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'cancelled')) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  target_id TEXT,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Set up Row Level Security (RLS)

-- Profiles: Users can read their own, admins can read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins/Librarians can manage all profiles" ON profiles ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'librarian'))
);

-- Books: All authenticated users can read, admins/librarians can manage
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read books" ON books FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins/Librarians can manage books" ON books ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'librarian'))
);

-- Patrons: Admins/Librarians can manage all, users can read their own (matched by email)
ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins/Librarians can manage patrons" ON patrons ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'librarian'))
);
CREATE POLICY "Users can read their own patron record" ON patrons FOR SELECT USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Checkouts: Admins/Librarians manage all, patrons read their own
ALTER TABLE checkouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins/Librarians can manage checkouts" ON checkouts ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'librarian'))
);
CREATE POLICY "Patrons can read their own checkouts" ON checkouts FOR SELECT USING (
  patron_id IN (SELECT id FROM patrons WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Borrow Requests: All can read/create, admins manage
ALTER TABLE borrow_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage their own requests" ON borrow_requests ALL USING (
  patron_id IN (SELECT id FROM patrons WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()))
);
CREATE POLICY "Admins/Librarians can manage all requests" ON borrow_requests ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'librarian'))
);

-- Activity Logs: Admins read all, users create
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read activity logs" ON activity_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'librarian'))
);
CREATE POLICY "Authenticated users can insert logs" ON activity_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RPC for Process Return
CREATE OR REPLACE FUNCTION process_return(
  p_checkout_id UUID,
  p_staff_user_id UUID,
  p_condition TEXT,
  p_damage_types TEXT[],
  p_notes TEXT,
  p_fine_amount DECIMAL
) RETURNS JSONB AS $$
DECLARE
  v_checkout RECORD;
  v_book RECORD;
  v_patron RECORD;
  v_activity_id UUID;
BEGIN
  -- 1. Get Checkout
  SELECT * FROM checkouts WHERE id = p_checkout_id INTO v_checkout;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Checkout not found');
  END IF;
  
  IF v_checkout.status != 'active' AND v_checkout.status != 'overdue' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Checkout is not active');
  END IF;

  -- 2. Get Book and Patron
  SELECT * FROM books WHERE id = v_checkout.book_id INTO v_book;
  SELECT * FROM patrons WHERE id = v_checkout.patron_id INTO v_patron;

  -- 3. Update Checkout
  UPDATE checkouts SET
    status = CASE WHEN p_condition = 'lost' THEN 'lost' ELSE 'returned' END,
    returned_date = NOW(),
    returned_to = p_staff_user_id,
    fine_accrued = p_fine_amount,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_checkout_id;

  -- 4. Update Book
  UPDATE books SET
    available_copies = CASE WHEN p_condition = 'lost' THEN available_copies ELSE available_copies + 1 END,
    status = CASE 
      WHEN p_condition = 'lost' THEN status 
      WHEN (available_copies + 1) >= 2 THEN 'available' 
      ELSE 'low_stock' 
    END,
    updated_at = NOW()
  WHERE id = v_checkout.book_id;

  -- 5. Update Patron
  UPDATE patrons SET
    current_checkouts = GREATEST(0, current_checkouts - 1),
    fines_due = fines_due + p_fine_amount,
    updated_at = NOW()
  WHERE id = v_checkout.patron_id;

  -- 6. Log Activity
  INSERT INTO activity_logs (type, description, user_id, target_id, metadata, timestamp)
  VALUES (
    'return',
    'Book "' || v_book.title || '" returned by ' || v_patron.first_name || ' ' || v_patron.last_name,
    p_staff_user_id,
    v_book.id::TEXT,
    jsonb_build_object(
      'patronId', v_checkout.patron_id,
      'checkoutId', p_checkout_id,
      'fineCharged', p_fine_amount,
      'condition', p_condition,
      'damageTypes', p_damage_types
    ),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'fineCharged', p_fine_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for Perform Checkout
CREATE OR REPLACE FUNCTION perform_checkout(
  p_patron_id UUID,
  p_book_ids UUID[],
  p_staff_user_id UUID,
  p_due_date TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_patron RECORD;
  v_book_id UUID;
  v_book RECORD;
  v_checkout_id UUID;
BEGIN
  -- 1. Get and Validate Patron
  SELECT * FROM patrons WHERE id = p_patron_id INTO v_patron;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patron not found');
  END IF;

  IF v_patron.membership_status != 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Patron membership is not active');
  END IF;

  IF v_patron.fines_due > 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Checkout blocked: Outstanding fines exceed $20');
  END IF;

  IF (v_patron.current_checkouts + array_length(p_book_ids, 1)) > v_patron.max_books_allowed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Checkout blocked: Limit of ' || v_patron.max_books_allowed || ' books exceeded');
  END IF;

  -- 2. Process each book
  FOREACH v_book_id IN ARRAY p_book_ids
  LOOP
    -- Get and Validate Book
    SELECT * FROM books WHERE id = v_book_id INTO v_book;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Book with ID % not found', v_book_id;
    END IF;

    IF v_book.available_copies < 1 OR v_book.status = 'unavailable' THEN
      RAISE EXCEPTION 'Book "%" is currently unavailable', v_book.title;
    END IF;

    -- Update Book
    UPDATE books SET
      available_copies = available_copies - 1,
      status = CASE WHEN (available_copies - 1) = 0 THEN 'unavailable' WHEN (available_copies - 1) < 2 THEN 'low_stock' ELSE 'available' END,
      updated_at = NOW()
    WHERE id = v_book_id;

    -- Create Checkout
    INSERT INTO checkouts (
      book_id, patron_id, checkout_date, due_date, status, checked_out_by, 
      book_title, book_isbn, patron_name, patron_member_id
    ) VALUES (
      v_book_id, p_patron_id, NOW(), p_due_date, 'active', p_staff_user_id,
      v_book.title, v_book.isbn, v_patron.first_name || ' ' || v_patron.last_name, v_patron.member_id
    ) RETURNING id INTO v_checkout_id;

    -- Log Activity
    INSERT INTO activity_logs (type, description, user_id, target_id, metadata, timestamp)
    VALUES (
      'checkout',
      'Checked out "' || v_book.title || '" to ' || v_patron.first_name || ' ' || v_patron.last_name,
      p_staff_user_id,
      v_book_id::TEXT,
      jsonb_build_object('patronId', p_patron_id, 'checkoutId', v_checkout_id, 'isbn', v_book.isbn),
      NOW()
    );
  END LOOP;

  -- 3. Update Patron counters
  UPDATE patrons SET
    current_checkouts = current_checkouts + array_length(p_book_ids, 1),
    total_checkouts_history = total_checkouts_history + array_length(p_book_ids, 1),
    updated_at = NOW()
  WHERE id = p_patron_id;

  RETURN jsonb_build_object('success', true, 'count', array_length(p_book_ids, 1));
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
