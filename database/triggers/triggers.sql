-- Triggers for players table
CREATE TRIGGER set_vip_code_trigger 
BEFORE INSERT ON public.players 
FOR EACH ROW EXECUTE FUNCTION set_vip_code();

-- Triggers for recharge_requests table
CREATE TRIGGER create_recharge_transaction 
AFTER INSERT ON public.recharge_requests 
FOR EACH ROW EXECUTE FUNCTION handle_recharge_request_transaction();

CREATE TRIGGER sync_recharge_transaction_trigger 
AFTER UPDATE ON public.recharge_requests 
FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) 
EXECUTE FUNCTION sync_recharge_transaction();

CREATE TRIGGER delete_recharge_transaction_trigger 
BEFORE DELETE ON public.recharge_requests 
FOR EACH ROW EXECUTE FUNCTION handle_recharge_delete();

CREATE TRIGGER calculate_promo_amount_trigger 
BEFORE INSERT OR UPDATE OF promo_type, bonus_amount ON public.recharge_requests 
FOR EACH ROW EXECUTE FUNCTION calculate_promo_amount();

CREATE TRIGGER set_recharge_vip_code_trigger 
BEFORE INSERT OR UPDATE ON public.recharge_requests 
FOR EACH ROW EXECUTE FUNCTION set_recharge_vip_code();

CREATE TRIGGER tr_set_recharge_id 
BEFORE INSERT ON public.recharge_requests 
FOR EACH ROW WHEN (NEW.recharge_id IS NULL) 
EXECUTE FUNCTION set_recharge_id();

CREATE TRIGGER sync_deposit_status_trigger 
AFTER UPDATE OF deposit_status ON public.recharge_requests 
FOR EACH ROW EXECUTE FUNCTION sync_deposit_status();

CREATE TRIGGER company_tag_assignment_trigger 
BEFORE UPDATE ON public.recharge_requests 
FOR EACH ROW WHEN (OLD.assigned_ct IS DISTINCT FROM NEW.assigned_ct) 
EXECUTE FUNCTION handle_company_tag_assignment();

-- Triggers for redeem_requests table
CREATE TRIGGER create_redeem_transaction 
AFTER INSERT ON public.redeem_requests 
FOR EACH ROW EXECUTE FUNCTION handle_redeem_request_transaction();

CREATE TRIGGER sync_redeem_transaction_trigger 
AFTER UPDATE ON public.redeem_requests 
FOR EACH ROW EXECUTE FUNCTION sync_redeem_transaction();

CREATE TRIGGER delete_redeem_transaction_trigger 
BEFORE DELETE ON public.redeem_requests 
FOR EACH ROW EXECUTE FUNCTION handle_redeem_delete();

CREATE TRIGGER set_redeem_vip_code_trigger 
BEFORE INSERT OR UPDATE ON public.redeem_requests 
FOR EACH ROW EXECUTE FUNCTION set_redeem_vip_code();

CREATE TRIGGER tr_set_redeem_id 
BEFORE INSERT ON public.redeem_requests 
FOR EACH ROW WHEN (NEW.redeem_id IS NULL) 
EXECUTE FUNCTION set_redeem_id();

CREATE TRIGGER update_amount_available 
BEFORE INSERT OR UPDATE OF total_amount, amount_paid, amount_hold ON public.redeem_requests 
FOR EACH ROW EXECUTE FUNCTION calculate_amount_available();

-- Triggers for users table
CREATE TRIGGER handle_role_update_trigger 
AFTER UPDATE OF role, ent_access ON public.users 
FOR EACH ROW WHEN ((OLD.role IS DISTINCT FROM NEW.role) OR (OLD.ent_access IS DISTINCT FROM NEW.ent_access)) 
EXECUTE FUNCTION handle_role_update();

CREATE TRIGGER sync_user_profile_pic_trigger 
AFTER INSERT OR UPDATE OF user_profile_pic ON public.users 
FOR EACH ROW EXECUTE FUNCTION sync_user_profile_pic();

CREATE TRIGGER sync_user_metadata_trigger 
AFTER UPDATE ON public.users 
FOR EACH ROW EXECUTE FUNCTION sync_user_metadata();

CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON public.users 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for other tables
CREATE TRIGGER update_ct_activity_logs_updated_at 
BEFORE UPDATE ON public.ct_activity_logs 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_tag_last_active 
BEFORE UPDATE OF balance, total_received, total_withdrawn, transaction_count ON public.company_tags 
FOR EACH ROW EXECUTE FUNCTION update_company_tag_last_active();

CREATE TRIGGER on_player_approval 
BEFORE UPDATE ON public.pending_players 
FOR EACH ROW EXECUTE FUNCTION handle_player_approval();

CREATE TRIGGER trigger_update_reset_password_requests_timestamp 
BEFORE UPDATE ON public.reset_password_requests 
FOR EACH ROW EXECUTE FUNCTION update_reset_password_requests_updated_at(); 