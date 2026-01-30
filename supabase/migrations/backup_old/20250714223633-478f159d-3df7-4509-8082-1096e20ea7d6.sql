CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_month INT, p_year INT)
RETURNS void AS $$
BEGIN
    INSERT INTO monthly_usage (user_id, month, year, interaction_count)
    VALUES (p_user_id, p_month, p_year, 1)
    ON CONFLICT (user_id, month, year)
    DO UPDATE SET interaction_count = monthly_usage.interaction_count + 1;
END;
$$ LANGUAGE plpgsql;