from psycopg.rows import dict_row

from api.database import get_connection


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