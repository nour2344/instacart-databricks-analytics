from psycopg.rows import dict_row

from api.database import get_connection


# ============================================================
# Smart Shopping Assistant recommendations
# ============================================================

def get_customer_recommendations(user_id: int):
    """
    Retrieve Smart Shopping Assistant recommendations
    for one customer from Neon PostgreSQL.
    """

    query = """
        SELECT
            user_id,
            target_order_id,
            product_id,
            recommendation_rank,
            product_name,
            aisle,
            department,
            purchase_probability,
            recommendation_type,
            reorder_status,
            shopping_section,
            client_action,
            candidate_source,
            why_recommended
        FROM shopping_assistant_recommendations
        WHERE user_id = %s
        ORDER BY recommendation_rank;
    """

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()

    return rows


# ============================================================
# Customer list
# ============================================================

def get_customers(limit: int = 100):
    """
    Retrieve customers that have Smart Shopping Assistant
    recommendations available.
    """

    query = """
        SELECT
            user_id,
            COUNT(*) AS recommendation_count,
            MAX(target_order_id) AS target_order_id
        FROM shopping_assistant_recommendations
        GROUP BY user_id
        ORDER BY user_id
        LIMIT %s;
    """

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (limit,))
            rows = cursor.fetchall()

    return rows


# ============================================================
# Next-Basket predictions
# ============================================================

def get_next_basket_predictions(user_id: int):
    """
    Return the Top-10 ML next-basket predictions
    for one customer from Neon PostgreSQL.
    """

    query = """
        SELECT
            user_id,
            target_order_id,
            prediction_rank,
            product_id,
            product_name,
            aisle,
            department,
            purchase_probability,
            predicted_probability_pct,
            prediction_type,
            is_new_to_customer,
            candidate_source
        FROM next_basket_predictions
        WHERE user_id = %s
        ORDER BY prediction_rank ASC;
    """

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()

    return rows


# ============================================================
# Customer Shopping DNA
# ============================================================

def get_customer_shopping_dna(user_id: int):
    """
    Retrieve the Customer Shopping DNA profile
    for one customer from Neon PostgreSQL.
    """

    query = """
        SELECT
            user_id,

            shopping_persona,
            dna_headline,
            shopping_dna_code,

            shopping_dna_summary,
            persona_description,
            dominant_trait_insight,

            loyalty_score,
            exploration_score,
            routine_score,
            basket_intensity_score,
            category_concentration_score,

            dominant_dna_trait,
            dominant_dna_score,

            loyalty_profile,
            shopping_frequency,
            basket_momentum,
            shopping_regularity,

            avg_basket_size,
            avg_days_between_orders,

            preferred_hour,
            preferred_hour_label,
            preferred_time_period,

            customer_prior_orders,
            customer_unique_products,

            favorite_department,
            favorite_department_affinity_pct,

            second_department,
            second_department_affinity_pct,

            third_department,
            third_department_affinity_pct,

            favorite_aisle,
            favorite_aisle_affinity_pct,

            second_aisle,
            second_aisle_affinity_pct,

            third_aisle,
            third_aisle_affinity_pct,

            loyalty_insight,
            frequency_insight,
            basket_insight,
            category_insight,
            time_insight

        FROM customer_shopping_dna
        WHERE user_id = %s;
    """

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (user_id,))
            row = cursor.fetchone()

    return row

    # ============================================================
# Reorder Planner
# ============================================================

def get_customer_reorder_planner(user_id: int):
    """
    Retrieve reorder-cycle intelligence for one customer.

    This powers the Reorder Planner experience using existing
    purchase-cycle features generated in Databricks.
    """

    query = """
        SELECT
            user_id,
            target_order_id,
            product_id,
            recommendation_rank,

            product_name,
            aisle,
            department,

            purchase_probability,

            reorder_status,
            shopping_section,
            client_action,
            why_recommended,

            orders_since_last_product_purchase,
            user_product_avg_order_gap,
            user_product_due_score,
            user_product_reorder_rate,

            customer_aisle_affinity,
            customer_department_affinity

        FROM shopping_assistant_recommendations

        WHERE user_id = %s
          AND recommendation_type = 'REORDER'

        ORDER BY
            CASE reorder_status
                WHEN 'OVERDUE' THEN 1
                WHEN 'DUE_NOW' THEN 2
                WHEN 'DUE_SOON' THEN 3
                WHEN 'EARLY' THEN 4
                WHEN 'NO_ESTABLISHED_CYCLE' THEN 5
                ELSE 6
            END,
            user_product_due_score DESC,
            purchase_probability DESC;
    """

    with get_connection() as connection:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (user_id,))
            rows = cursor.fetchall()

    return rows