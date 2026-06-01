-- Run this in Supabase SQL Editor to add missing columns

-- snapshot column for stock_log (stores previous item state for rollback)
alter table stock_log add column if not exists snapshot text;

-- Make sure audit_log has all needed columns  
alter table audit_log add column if not exists user_name text;
alter table audit_log add column if not exists before text;
alter table audit_log add column if not exists after text;
