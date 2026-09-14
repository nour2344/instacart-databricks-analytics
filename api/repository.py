from psycopg.rows import dict_row

from api.database import get_connection


# ============================================================
# Internal helpers
# ============================================================

def _safe_limit(
    value: int,
    default: int = 10,
    maximum: int = 100,
) -> int:
    """
    Normalize a LIMIT value so API callers cannot request
    unnecessarily large result sets.
    """

    try:
        value = int(value)
    except (TypeError, ValueError):
        value = default

    return max(
        1,
        min(value, maximum),
    )


def _fetch_all(
    query: str,
    params=(),
):
    """
    Execute a read-only query and return all rows as dictionaries.
    """

    with get_connection() as connection:
        with connection.cursor(
            row_factory=dict_row
        ) as cursor:

            cursor.execute(
                query,
                params,
            )

            return cursor.fetchall()


def _fetch_one(
    query: str,
    params=(),
):
    """
    Execute a read-only query and return one row as a dictionary.
    """

    with get_connection() as connection:
        with connection.cursor(
            row_factory=dict_row
        ) as cursor:

            cursor.execute(
                query,
                params,
            )

            return cursor.fetchone()


# ============================================================
# EXISTING CUSTOMER INTELLIGENCE
# ============================================================


# ============================================================
# Smart Shopping Assistant / recommendation explanations
# ============================================================

def get_customer_recommendations(
    user_id: int,
):
    """
    Retrieve served recommendation intelligence for one customer.

    This remains part of the final retailer platform through
    Customer 360 and Recommendation Intelligence.
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

    return _fetch_all(
        query,
        (user_id,),
    )


# ============================================================
# Customer list
# ============================================================

def get_customers(
    limit: int = 100,
):
    """
    Retrieve customers with recommendation data available.
    """

    limit = _safe_limit(
        limit,
        default=100,
        maximum=500,
    )

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

    return _fetch_all(
        query,
        (limit,),
    )


# ============================================================
# Next-Basket predictions
# ============================================================

def get_next_basket_predictions(
    user_id: int,
):
    """
    Return the Top-10 ML next-basket predictions
    for one customer.
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

    return _fetch_all(
        query,
        (user_id,),
    )


# ============================================================
# Customer Shopping DNA
# ============================================================

def get_customer_shopping_dna(
    user_id: int,
):
    """
    Retrieve the Customer Shopping DNA profile
    for one customer.
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

    return _fetch_one(
        query,
        (user_id,),
    )


# ============================================================
# Reorder intelligence
# ============================================================

def get_customer_reorder_planner(
    user_id: int,
):
    """
    Retrieve reorder-cycle intelligence for one customer.

    The final retailer UI will use this as analytical purchase-cycle
    intelligence rather than as a consumer shopping list.
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

                WHEN 'OVERDUE'
                    THEN 1

                WHEN 'DUE_NOW'
                    THEN 2

                WHEN 'DUE_SOON'
                    THEN 3

                WHEN 'EARLY'
                    THEN 4

                WHEN 'NO_ESTABLISHED_CYCLE'
                    THEN 5

                ELSE 6

            END,

            user_product_due_score DESC NULLS LAST,
            purchase_probability DESC NULLS LAST;
    """

    return _fetch_all(
        query,
        (user_id,),
    )


# ============================================================
# RETAIL INTELLIGENCE
# ============================================================


# ============================================================
# Executive overview
# ============================================================

def get_retail_overview():
    """
    Return executive retail KPIs from the Databricks Gold
    retail_product_segments serving table.
    """

    query = """
        WITH department_totals AS (

            SELECT
                department,
                SUM(
                    total_purchase_count
                ) AS purchases

            FROM retail_product_segments

            GROUP BY department
        )

        SELECT
            COUNT(*) AS products_analyzed,

            COUNT(
                DISTINCT department
            ) AS departments_analyzed,

            SUM(
                total_purchase_count
            ) AS total_purchase_events,

            COUNT(*) FILTER (
                WHERE product_segment = 'CORE STAPLE'
            ) AS core_staples,

            ROUND(

                100.0 *

                (
                    AVG(
                        product_reorder_rate
                    )

                    FILTER (
                        WHERE product_segment = 'CORE STAPLE'
                    )
                )::numeric,

                1

            ) AS core_staple_repeat_rate_pct,

            ROUND(

                MAX(
                    customer_penetration_pct
                )::numeric,

                1

            ) AS highest_customer_reach_pct,

            (
                SELECT
                    product_name

                FROM retail_product_segments

                ORDER BY
                    total_purchase_count DESC,
                    product_id ASC

                LIMIT 1

            ) AS top_product,

            (
                SELECT
                    total_purchase_count

                FROM retail_product_segments

                ORDER BY
                    total_purchase_count DESC,
                    product_id ASC

                LIMIT 1

            ) AS top_product_purchase_count,

            (
                SELECT
                    department

                FROM department_totals

                ORDER BY
                    purchases DESC,
                    department ASC

                LIMIT 1

            ) AS top_department,

            (
                SELECT
                    purchases

                FROM department_totals

                ORDER BY
                    purchases DESC,
                    department ASC

                LIMIT 1

            ) AS top_department_purchase_count

        FROM retail_product_segments;
    """

    return _fetch_one(query)


# ============================================================
# Product Intelligence — Top products
# ============================================================

def get_retail_top_products(
    limit: int = 10,
    department: str | None = None,
):
    """
    Return highest-volume products.

    Optionally filter the ranking to one department.
    """

    limit = _safe_limit(
        limit,
        default=10,
        maximum=100,
    )

    if department:

        query = """
            SELECT
                product_id,
                product_name,
                department,

                total_purchase_count,
                unique_customer_count,

                customer_penetration_pct,
                product_reorder_rate,
                purchases_per_customer,

                purchase_rank,
                department_purchase_rank,

                demand_tier,
                repeat_behavior_tier,

                metric_reliability,

                product_segment,
                business_focus

            FROM retail_product_segments

            WHERE
                LOWER(department) = LOWER(%s)

            ORDER BY
                total_purchase_count DESC,
                product_id ASC

            LIMIT %s;
        """

        params = (
            department.strip(),
            limit,
        )

    else:

        query = """
            SELECT
                product_id,
                product_name,
                department,

                total_purchase_count,
                unique_customer_count,

                customer_penetration_pct,
                product_reorder_rate,
                purchases_per_customer,

                purchase_rank,
                department_purchase_rank,

                demand_tier,
                repeat_behavior_tier,

                metric_reliability,

                product_segment,
                business_focus

            FROM retail_product_segments

            ORDER BY
                total_purchase_count DESC,
                product_id ASC

            LIMIT %s;
        """

        params = (
            limit,
        )

    return _fetch_all(
        query,
        params,
    )


# ============================================================
# Product Intelligence — Portfolio segments
# ============================================================

def get_retail_product_segments():
    """
    Aggregate product-level Gold data into the six
    portfolio segments created in Databricks.
    """

    query = """
        SELECT
            product_segment,

            COUNT(*) AS product_count,

            ROUND(
                AVG(
                    total_purchase_count
                )::numeric,
                2
            ) AS avg_purchases_per_product,

            ROUND(
                100.0 *
                AVG(
                    product_reorder_rate
                )::numeric,
                1
            ) AS avg_reorder_rate_pct,

            ROUND(
                AVG(
                    customer_penetration_pct
                )::numeric,
                2
            ) AS avg_customer_reach_pct,

            MIN(
                business_focus
            ) AS business_focus

        FROM retail_product_segments

        GROUP BY product_segment

        ORDER BY
            product_count DESC,
            product_segment ASC;
    """

    return _fetch_all(query)


# ============================================================
# Product Intelligence — Departments
# ============================================================

def get_retail_departments(
    limit: int = 10,
):
    """
    Aggregate product intelligence at department level.
    """

    limit = _safe_limit(
        limit,
        default=10,
        maximum=50,
    )

    query = """
        SELECT
            department,

            COUNT(*) AS product_count,

            SUM(
                total_purchase_count
            ) AS total_purchase_count,

            ROUND(
                100.0 *
                AVG(
                    product_reorder_rate
                )::numeric,
                1
            ) AS avg_reorder_rate_pct,

            ROUND(
                AVG(
                    customer_penetration_pct
                )::numeric,
                2
            ) AS avg_customer_reach_pct

        FROM retail_product_segments

        GROUP BY department

        ORDER BY
            total_purchase_count DESC,
            department ASC

        LIMIT %s;
    """

    return _fetch_all(
        query,
        (limit,),
    )


# ============================================================
# Product Intelligence — Individual product
# ============================================================

def get_retail_product(
    product_id: int,
):
    """
    Return the complete Retail Gold profile
    for one product.
    """

    query = """
        SELECT
            product_id,
            product_name,
            department,

            total_purchase_count,
            unique_customer_count,

            customer_penetration_pct,
            product_reorder_rate,
            purchases_per_customer,

            purchase_rank,
            department_purchase_rank,

            demand_tier,
            repeat_behavior_tier,

            metric_reliability,

            product_segment,
            business_focus

        FROM retail_product_segments

        WHERE product_id = %s;
    """

    return _fetch_one(
        query,
        (product_id,),
    )


# ============================================================
# RECOMMENDATION INTELLIGENCE — AGGREGATE VIEW
# ============================================================


# ============================================================
# Recommendation KPIs
# ============================================================

def get_recommendation_intelligence_overview():
    """
    Aggregate the served recommendation layer into
    retailer-facing recommendation KPIs.
    """

    query = """
        SELECT
            COUNT(
                DISTINCT user_id
            ) AS customers_served,

            COUNT(*) AS recommendations_generated,

            ROUND(
                100.0 *
                AVG(
                    purchase_probability
                )::numeric,
                1
            ) AS avg_purchase_probability_pct,

            COUNT(*) FILTER (
                WHERE recommendation_type = 'REORDER'
            ) AS reorder_recommendations,

            COUNT(*) FILTER (
                WHERE recommendation_type <> 'REORDER'
            ) AS non_reorder_recommendations,

            COUNT(
                DISTINCT department
            ) AS departments_recommended

        FROM shopping_assistant_recommendations;
    """

    return _fetch_one(query)


# ============================================================
# Recommendation candidate-source mix
# ============================================================

def get_recommendation_source_mix():
    """
    Distribution of served recommendations by
    candidate-generation source.
    """

    query = """
        SELECT
            COALESCE(
                candidate_source,
                'unknown'
            ) AS candidate_source,

            COUNT(*) AS recommendation_count,

            ROUND(

                100.0 *
                COUNT(*)

                /

                NULLIF(
                    SUM(
                        COUNT(*)
                    ) OVER (),
                    0
                ),

                2

            ) AS share_pct

        FROM shopping_assistant_recommendations

        GROUP BY
            COALESCE(
                candidate_source,
                'unknown'
            )

        ORDER BY
            recommendation_count DESC,
            candidate_source ASC;
    """

    return _fetch_all(query)


# ============================================================
# Recommendation probability by rank
# ============================================================

def get_recommendation_rank_performance():
    """
    Return average purchase probability by recommendation rank.
    """

    query = """
        SELECT
            recommendation_rank,

            COUNT(*) AS recommendation_count,

            ROUND(
                100.0 *
                AVG(
                    purchase_probability
                )::numeric,
                1
            ) AS avg_purchase_probability_pct

        FROM shopping_assistant_recommendations

        GROUP BY recommendation_rank

        ORDER BY recommendation_rank ASC;
    """

    return _fetch_all(query)


# ============================================================
# Recommendation department mix
# ============================================================

def get_recommendation_departments(
    limit: int = 10,
):
    """
    Departments most frequently represented in
    served recommendations.
    """

    limit = _safe_limit(
        limit,
        default=10,
        maximum=50,
    )

    query = """
        SELECT
            department,

            COUNT(*) AS recommendation_count,

            ROUND(
                100.0 *
                AVG(
                    purchase_probability
                )::numeric,
                1
            ) AS avg_purchase_probability_pct

        FROM shopping_assistant_recommendations

        GROUP BY department

        ORDER BY
            recommendation_count DESC,
            department ASC

        LIMIT %s;
    """

    return _fetch_all(
        query,
        (limit,),
    )


# ============================================================
# CUSTOMER INTELLIGENCE — AGGREGATE VIEW
# ============================================================


# ============================================================
# Customer behavior KPIs
# ============================================================

def get_customer_intelligence_overview():
    """
    Aggregate Customer Shopping DNA into retailer-facing
    behavioral KPIs.
    """

    query = """
        SELECT
            COUNT(*) AS customers_profiled,

            ROUND(
                AVG(
                    avg_basket_size
                )::numeric,
                1
            ) AS avg_basket_size,

            ROUND(
                AVG(
                    avg_days_between_orders
                )::numeric,
                1
            ) AS avg_days_between_orders,

            ROUND(
                AVG(
                    loyalty_score
                )::numeric,
                1
            ) AS avg_loyalty_score,

            ROUND(
                AVG(
                    exploration_score
                )::numeric,
                1
            ) AS avg_exploration_score,

            ROUND(
                AVG(
                    routine_score
                )::numeric,
                1
            ) AS avg_routine_score,

            ROUND(
                AVG(
                    basket_intensity_score
                )::numeric,
                1
            ) AS avg_basket_intensity_score,

            ROUND(
                AVG(
                    category_concentration_score
                )::numeric,
                1
            ) AS avg_category_concentration_score

        FROM customer_shopping_dna;
    """

    return _fetch_one(query)


# ============================================================
# Shopping persona distribution
# ============================================================

def get_customer_persona_distribution(
    limit: int = 10,
):
    """
    Return the most common Shopping DNA personas.
    """

    limit = _safe_limit(
        limit,
        default=10,
        maximum=25,
    )

    query = """
        SELECT
            COALESCE(
                shopping_persona,
                'Unknown'
            ) AS shopping_persona,

            COUNT(*) AS customer_count,

            ROUND(

                100.0 *
                COUNT(*)

                /

                NULLIF(
                    SUM(
                        COUNT(*)
                    ) OVER (),
                    0
                ),

                2

            ) AS share_pct

        FROM customer_shopping_dna

        GROUP BY
            COALESCE(
                shopping_persona,
                'Unknown'
            )

        ORDER BY
            customer_count DESC,
            shopping_persona ASC

        LIMIT %s;
    """

    return _fetch_all(
        query,
        (limit,),
    )


# ============================================================
# Favorite department distribution
# ============================================================

def get_customer_favorite_departments(
    limit: int = 10,
):
    """
    Return departments that most often appear as customers'
    strongest department affinity.
    """

    limit = _safe_limit(
        limit,
        default=10,
        maximum=50,
    )

    query = """
        SELECT
            COALESCE(
                favorite_department,
                'Unknown'
            ) AS department,

            COUNT(*) AS customer_count,

            ROUND(

                100.0 *
                COUNT(*)

                /

                NULLIF(
                    SUM(
                        COUNT(*)
                    ) OVER (),
                    0
                ),

                2

            ) AS customer_share_pct,

            ROUND(
                AVG(
                    favorite_department_affinity_pct
                )::numeric,
                1
            ) AS avg_affinity_pct

        FROM customer_shopping_dna

        GROUP BY
            COALESCE(
                favorite_department,
                'Unknown'
            )

        ORDER BY
            customer_count DESC,
            department ASC

        LIMIT %s;
    """

    return _fetch_all(
        query,
        (limit,),
    )