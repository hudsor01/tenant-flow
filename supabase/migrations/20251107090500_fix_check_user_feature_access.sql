-- Rebuild check_user_feature_access RPC to align with updated plan metadata
-- Prevents "target column number not match" errors and adds safe fallbacks

CREATE OR REPLACE FUNCTION public.check_user_feature_access(
    p_user_id text,
    p_feature text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
    normalized_feature text := lower(trim(coalesce(p_feature, '')));
    feature_record user_feature_access%ROWTYPE;
    subscription_status text;
    property_limit integer;
    property_count integer := 0;
BEGIN
    IF normalized_feature = '' THEN
        RETURN false;
    END IF;

    SELECT *
      INTO feature_record
      FROM user_feature_access
      WHERE "userId" = p_user_id
      ORDER BY "updatedAt" DESC
      LIMIT 1;

    SELECT upper(subscription_status)
      INTO subscription_status
      FROM users
      WHERE id = p_user_id;

    IF normalized_feature IN ('basic_properties', 'properties_basic') THEN
        property_limit := feature_record."maxProperties";

        SELECT COUNT(*)
          INTO property_count
          FROM property
          WHERE "ownerId" = p_user_id;

        IF subscription_status IN ('ACTIVE', 'TRIALING') THEN
            RETURN true;
        ELSIF property_limit IS NULL THEN
            -- Free tier: allow one property until subscription is upgraded
            RETURN property_count = 0;
        ELSE
            RETURN property_count < property_limit;
        END IF;
    END IF;

    CASE normalized_feature
        WHEN 'advanced_analytics' THEN
            RETURN COALESCE(feature_record."canAccessAdvancedAnalytics", false);
        WHEN 'api_access' THEN
            RETURN COALESCE(feature_record."canAccessAPI", false);
        WHEN 'bulk_operations' THEN
            RETURN COALESCE(feature_record."canUseBulkOperations", false);
        WHEN 'premium_integrations' THEN
            RETURN COALESCE(feature_record."canUsePremiumIntegrations", false);
        WHEN 'team_invites', 'team_members' THEN
            RETURN COALESCE(feature_record."canInviteTeamMembers", false);
        WHEN 'data_export' THEN
            RETURN COALESCE(feature_record."canExportData", false);
        WHEN 'priority_support' THEN
            RETURN COALESCE(feature_record."hasPrioritySupport", false);
        WHEN 'storage' THEN
            RETURN COALESCE(feature_record."maxStorageGB", 0) > 0;
        ELSE
            RETURN false;
    END CASE;
END;
$$;
