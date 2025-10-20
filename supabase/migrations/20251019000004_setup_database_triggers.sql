-- Setup database triggers for automated webhooks and email notifications
-- These triggers call pg_net functions to send data to external services

-- Tenant table: Send all changes to n8n
DROP TRIGGER IF EXISTS tenant_to_n8n ON tenant;
CREATE TRIGGER tenant_to_n8n
  AFTER INSERT OR UPDATE OR DELETE ON tenant
  FOR EACH ROW
  EXECUTE FUNCTION send_to_n8n();

COMMENT ON TRIGGER tenant_to_n8n ON tenant IS 'Sends tenant changes to n8n webhook';

-- Property table: Send all changes to n8n
DROP TRIGGER IF EXISTS property_to_n8n ON property;
CREATE TRIGGER property_to_n8n
  AFTER INSERT OR UPDATE OR DELETE ON property
  FOR EACH ROW
  EXECUTE FUNCTION send_to_n8n();

COMMENT ON TRIGGER property_to_n8n ON property IS 'Sends property changes to n8n webhook';

-- Rent Payments table: Send to n8n + Resend email for successful payments
DROP TRIGGER IF EXISTS rent_payment_to_n8n ON rent_payments;
CREATE TRIGGER rent_payment_to_n8n
  AFTER INSERT OR UPDATE OR DELETE ON rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION send_to_n8n();

COMMENT ON TRIGGER rent_payment_to_n8n ON rent_payments IS 'Sends rent payment changes to n8n webhook';

DROP TRIGGER IF EXISTS rent_payment_receipt_email ON rent_payments;
CREATE TRIGGER rent_payment_receipt_email
  AFTER INSERT OR UPDATE ON rent_payments
  FOR EACH ROW
  WHEN (NEW.status = 'PAID')
  EXECUTE FUNCTION send_payment_receipt_email();

COMMENT ON TRIGGER rent_payment_receipt_email ON rent_payments IS 'Sends payment receipt email via Resend when status = PAID';

-- Maintenance Request table: Send to n8n + Emergency alerts
DROP TRIGGER IF EXISTS maintenance_to_n8n ON maintenance_request;
CREATE TRIGGER maintenance_to_n8n
  AFTER INSERT OR UPDATE OR DELETE ON maintenance_request
  FOR EACH ROW
  EXECUTE FUNCTION send_to_n8n();

COMMENT ON TRIGGER maintenance_to_n8n ON maintenance_request IS 'Sends maintenance request changes to n8n webhook';

DROP TRIGGER IF EXISTS maintenance_emergency_alert ON maintenance_request;
CREATE TRIGGER maintenance_emergency_alert
  AFTER INSERT OR UPDATE ON maintenance_request
  FOR EACH ROW
  WHEN (NEW.priority = 'EMERGENCY')
  EXECUTE FUNCTION send_emergency_maintenance_alert();

COMMENT ON TRIGGER maintenance_emergency_alert ON maintenance_request IS 'Sends emergency alert email when priority = EMERGENCY';
