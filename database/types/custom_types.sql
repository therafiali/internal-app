-- Custom Types
CREATE TYPE aal_level AS ENUM ('aal1', 'aal2', 'aal3');
CREATE TYPE action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR');
CREATE TYPE action_status AS ENUM ('idle', 'in_progress');
CREATE TYPE cash_card_status AS ENUM ('pending', 'ordered', 'shipped', 'activated', 'deactivated', 'blocked');
CREATE TYPE company_tag_status AS ENUM ('active', 'paused', 'blocked', 'deleted', 'disabled');
CREATE TYPE company_tag_type AS ENUM ('cashapp', 'venmo', 'chime');
CREATE TYPE ct_type AS ENUM ('personal', 'business');
CREATE TYPE department_type AS ENUM ('Operations', 'Support', 'Verification', 'Finance', 'Admin', 'Audit');
CREATE TYPE deposit_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled', 'rejected', 'disputed', 'sc_processed', 'refunded', 'verified', 'paid');
CREATE TYPE ent_type AS ENUM ('ENT1', 'ENT2', 'ENT3', 'ENT4', 'ENT5', 'ENT6');
CREATE TYPE game_platform AS ENUM ('Orion Stars', 'Fire Kirin', 'Game Vault', 'VBlink', 'Vegas Sweeps', 'Ultra Panda', 'Yolo', 'Juwa', 'Moolah', 'Panda Master');
CREATE TYPE payment_method_type AS ENUM ('cashapp', 'venmo', 'chime', 'crypto');
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected', 'disputed');
CREATE TYPE processing_status AS ENUM ('idle', 'in_progress');
CREATE TYPE redeem_status AS ENUM ('pending', 'initiated', 'under_processing', 'processed', 'rejected', 'verification_failed', 'queued', 'paused', 'queued_partially_paid', 'paused_partially_paid', 'completed', 'unverified', 'verification_pending');
CREATE TYPE request_status AS ENUM ('pending', 'verification_pending', 'verification_failed', 'rejected', 'under_processing', 'completed', 'queued', 'queued_partially_paid', 'partially_paid', 'paused_partially_paid', 'paused', 'processed', 'initiated', 'verified', 'disputed', 'assigned', 'assigned_and_hold', 'sc_pending', 'sc_submitted', 'sc_processed', 'sc_rejected', 'sc_verified', 'sc_failed', 'unverified', 'cancel');
CREATE TYPE role_type AS ENUM ('Agent', 'Team Lead', 'Manager', 'Admin', 'Executive', 'Shift Incharge');
CREATE TYPE transfer_init_by AS ENUM ('agent', 'player');
CREATE TYPE transfer_status AS ENUM ('pending', 'completed', 'rejected');
CREATE TYPE user_status AS ENUM ('active', 'disabled');
CREATE TYPE verification_status AS ENUM ('verified', 'pending', 'failed'); 