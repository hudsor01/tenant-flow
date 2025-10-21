-- Fix calculate_monthly_metrics: increase DECIMAL precision and correct table names
-- Date: 2025-10-21
-- Issue: DECIMAL(10,2) overflowed for large financial values
-- Also fixes PascalCase table references to lowercase

CREATE OR REPLACE FUNCTION public.calculate_monthly_metrics(p_user_id uuid, p_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE))
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_monthly_data JSON[];
    v_month INT;
    v_revenue DECIMAL(15,2);  -- Increased from (10,2)
    v_expenses DECIMAL(15,2); -- Increased from (10,2)
    v_best_month TEXT;
    v_worst_month TEXT;
    v_best_revenue DECIMAL(15,2) := 0;
    v_worst_revenue DECIMAL(15,2) := 9999999999999.99; -- Max for DECIMAL(15,2)
    v_user_id_text TEXT;
BEGIN
    v_user_id_text := p_user_id::text;

    FOR v_month IN 1..12 LOOP
        -- Calculate revenue (FIXED: lowercase table names)
        SELECT COALESCE(SUM(l."rentAmount"), 0)
        INTO v_revenue
        FROM lease l
        JOIN property p ON p.id = l."propertyId"
        WHERE p."ownerId" = v_user_id_text
            AND l.status = 'ACTIVE'
            AND EXTRACT(YEAR FROM l."startDate") <= p_year
            AND EXTRACT(MONTH FROM l."startDate") <= v_month
            AND (l."endDate" IS NULL OR (
                EXTRACT(YEAR FROM l."endDate") >= p_year
                AND EXTRACT(MONTH FROM l."endDate") >= v_month
            ));

        -- Calculate expenses (FIXED: lowercase table names)
        SELECT COALESCE(SUM(e.amount), 0)
        INTO v_expenses
        FROM expense e
        JOIN property p ON p.id = e."propertyId"
        WHERE p."ownerId" = v_user_id_text
            AND EXTRACT(YEAR FROM e.date) = p_year
            AND EXTRACT(MONTH FROM e.date) = v_month;

        -- Track best and worst months
        IF v_revenue > v_best_revenue THEN
            v_best_revenue := v_revenue;
            v_best_month := TO_CHAR(TO_DATE(v_month::TEXT, 'MM'), 'Month');
        END IF;

        IF v_revenue < v_worst_revenue AND v_revenue > 0 THEN
            v_worst_revenue := v_revenue;
            v_worst_month := TO_CHAR(TO_DATE(v_month::TEXT, 'MM'), 'Month');
        END IF;

        -- Append to monthly data array
        v_monthly_data := array_append(v_monthly_data, json_build_object(
            'month', TO_CHAR(TO_DATE(v_month::TEXT, 'MM'), 'Month'),
            'revenue', v_revenue,
            'expenses', v_expenses,
            'netIncome', v_revenue - v_expenses
        ));
    END LOOP;

    RETURN json_build_object(
        'monthlyData', v_monthly_data,
        'bestMonth', v_best_month,
        'worstMonth', v_worst_month
    );
END;
$function$;
